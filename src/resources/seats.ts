/**
 * Seat operations:
 *   GET /v1/saas/{saasCustomerId}/seats
 *   PUT /v1/saas/{saasCustomerId}/{externalSubscriptionId}/bulkSeatChange
 */

import type { HttpClient } from '../http.js';
import {
  MAX_BULK_SEAT_IDS,
  SEAT_ACTION_TYPES,
  SEAT_TYPES,
  type BulkSeatChangeRequest,
  type BulkSeatChangeResult,
  type SaasProtectionSeat,
  type SeatListParams,
} from '../types/seats.js';
import { fetchAllPages } from '../pagination.js';

export class SeatsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List seats for a SaaS customer, optionally filtered by seat type. */
  async list(
    saasCustomerId: number | string,
    params?: SeatListParams
  ): Promise<SaasProtectionSeat[]> {
    return fetchAllPages<SaasProtectionSeat>(
      this.httpClient,
      `/${encodeURIComponent(String(saasCustomerId))}/seats`,
      { seatType: params?.seatType }
    );
  }

  /**
   * License, pause, or unlicense multiple seats in one call (Seat Management
   * 2.0 tenants only). WRITE: changes which seats are protected and billed.
   *
   * Validates inputs locally (case-sensitive enums, 1..100 ids) before
   * sending, so obviously-bad requests never reach Datto.
   */
  async bulkChange(
    saasCustomerId: number | string,
    externalSubscriptionId: string,
    request: BulkSeatChangeRequest
  ): Promise<BulkSeatChangeResult[] | Record<string, unknown>> {
    if (!externalSubscriptionId) {
      throw new Error('externalSubscriptionId is required (see GET /saas/domains)');
    }
    if (!SEAT_TYPES.includes(request.seatType)) {
      throw new Error(
        `Invalid seatType "${String(request.seatType)}" (expected one of ${SEAT_TYPES.join(', ')}; case-sensitive)`
      );
    }
    if (!SEAT_ACTION_TYPES.includes(request.actionType)) {
      throw new Error(
        `Invalid actionType "${String(request.actionType)}" (expected one of ${SEAT_ACTION_TYPES.join(', ')}; case-sensitive)`
      );
    }
    const ids = (request.ids ?? []).map((id) => String(id).trim()).filter((id) => id !== '');
    if (ids.length === 0) {
      throw new Error('ids must contain at least one remote seat ID');
    }
    if (ids.length > MAX_BULK_SEAT_IDS) {
      throw new Error(
        `Too many ids (${ids.length}); Datto recommends at most ${MAX_BULK_SEAT_IDS} seats per bulkSeatChange call`
      );
    }
    return this.httpClient.put<BulkSeatChangeResult[] | Record<string, unknown>>(
      `/${encodeURIComponent(String(saasCustomerId))}/${encodeURIComponent(externalSubscriptionId)}/bulkSeatChange`,
      { seat_type: request.seatType, action_type: request.actionType, ids }
    );
  }
}
