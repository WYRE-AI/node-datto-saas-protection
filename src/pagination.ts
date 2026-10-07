/**
 * Pagination helpers for the Datto REST API.
 *
 * Datto list endpoints answer either with a bare JSON array, or with a
 * page-numbered envelope:
 *
 *     { pagination: { page, perPage, totalPages, count }, items: T[] }
 *
 * Paged requests use the `_page` / `_perPage` query parameters (Datto REST API
 * convention, shared with the BCDR surface). {@link fetchAllPages} normalises
 * both shapes into a flat array, following `totalPages` when present.
 */

import type { HttpClient } from './http.js';

/** Default `_perPage` when following paged envelopes. */
export const DEFAULT_PAGE_LIMIT = 100;
/** Upper bound for `_perPage`. */
export const MAX_PAGE_LIMIT = 250;
/** Safety stop so a misbehaving upstream can't loop forever. */
export const MAX_PAGES = 100;

/** Datto pagination block. */
export interface DattoPagination {
  page?: number;
  perPage?: number;
  totalPages?: number;
  count?: number;
}

/** Datto paged envelope. */
export interface DattoPagedResponse<T> {
  pagination?: DattoPagination;
  items?: T[];
}

/** Clamp a requested page size into the valid range. */
export function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_LIMIT;
  if (limit < 1) return 1;
  if (limit > MAX_PAGE_LIMIT) return MAX_PAGE_LIMIT;
  return Math.floor(limit);
}

/** Normalise a Datto list response (bare array or envelope) to an array. */
export function extractItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response !== null && typeof response === 'object') {
    const items = (response as DattoPagedResponse<T>).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

/**
 * GET a Datto list endpoint and return every item.
 *
 * The first request is sent without paging params so endpoints that return a
 * bare array (e.g. `/saas/domains`, `/saas/{id}/seats`) behave exactly as
 * documented. If the response is a paged envelope with `totalPages > 1`, the
 * remaining pages are fetched with `_page` / `_perPage`.
 */
export async function fetchAllPages<T>(
  httpClient: HttpClient,
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  perPage?: number
): Promise<T[]> {
  const first = await httpClient.get<unknown>(path, params);
  const items = extractItems<T>(first);
  if (Array.isArray(first) || first === null || typeof first !== 'object') return items;

  const pagination = (first as DattoPagedResponse<T>).pagination;
  const totalPages = pagination?.totalPages ?? 1;
  if (totalPages <= 1) return items;

  const size = clampLimit(perPage ?? pagination?.perPage);
  const lastPage = Math.min(totalPages, MAX_PAGES);
  for (let page = (pagination?.page ?? 1) + 1; page <= lastPage; page++) {
    const next = await httpClient.get<unknown>(path, { ...params, _page: page, _perPage: size });
    const pageItems = extractItems<T>(next);
    if (pageItems.length === 0) break;
    items.push(...pageItems);
  }
  return items;
}
