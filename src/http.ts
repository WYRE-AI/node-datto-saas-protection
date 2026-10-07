/**
 * HTTP layer for the Datto SaaS Protection API.
 *
 * Authentication is HTTP Basic with a public/secret key pair issued from the
 * Datto Partner Portal. List pagination is handled in {@link ./pagination.ts}.
 */

import type { ResolvedConfig } from './config.js';
import type { RateLimiter } from './rate-limiter.js';
import {
  DattoSaasProtectionError,
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from './errors.js';

/**
 * Options for an HTTP request.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Authenticated HTTP client for the Datto SaaS Protection API.
 */
export class HttpClient {
  private readonly config: ResolvedConfig;
  private readonly rateLimiter: RateLimiter;

  constructor(config: ResolvedConfig, rateLimiter: RateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Make an authenticated request.
   *
   * @param path - API path beginning with "/", relative to the configured base URL
   *               (e.g. "/domains").
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;
    const url = buildUrl(this.config.apiUrl, path, params);
    const bodyString = body === undefined ? '' : JSON.stringify(body);
    return this.executeRequest<T>(url, method, bodyString, 0);
  }

  /** Make a JSON GET. */
  async get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  /** Make a JSON POST. */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  /** Make a JSON PUT. */
  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body });
  }

  private async executeRequest<T>(
    url: string,
    method: string,
    bodyString: string,
    retryCount: number
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    const basic = Buffer.from(
      `${this.config.publicKey}:${this.config.secretKey}`,
      'utf8',
    ).toString('base64');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    };
    if (bodyString) headers['Content-Type'] = 'application/json';

    this.rateLimiter.recordRequest();

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: bodyString || undefined,
      });
    } finally {
      this.rateLimiter.release();
    }

    return this.handleResponse<T>(response, url, method, bodyString, retryCount);
  }

  private async handleResponse<T>(
    response: Response,
    url: string,
    method: string,
    bodyString: string,
    retryCount: number
  ): Promise<T> {
    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      const text = await response.text();
      return (text === '' ? ({} as T) : (text as unknown as T));
    }

    let responseBody: unknown;
    try {
      responseBody = await response.clone().json();
    } catch {
      try {
        responseBody = await response.text();
      } catch {
        responseBody = undefined;
      }
    }

    switch (response.status) {
      case 401:
        throw new DattoSaasProtectionAuthenticationError(
          'Authentication failed (401). Verify the Datto REST API public/secret key pair (Partner Portal > Admin > Integrations > API Keys) and that the key is active.',
          401,
          responseBody
        );
      case 403:
        throw new DattoSaasProtectionForbiddenError(
          'Access forbidden (403) — the API key is not permitted to access this SaaS Protection customer/resource',
          responseBody
        );
      case 404:
        throw new DattoSaasProtectionNotFoundError(
          'Not found (404) — unknown saasCustomerId/externalSubscriptionId, or the route does not exist',
          responseBody
        );
      case 409:
        throw new DattoSaasProtectionConflictError(
          'Conflict (409) — the request conflicts with the current seat state',
          responseBody
        );
      case 429: {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds =
          retryAfterHeader != null && retryAfterHeader !== ''
            ? parseInt(retryAfterHeader, 10)
            : undefined;
        if (this.rateLimiter.shouldRetry(retryCount)) {
          const delay = this.rateLimiter.calculateRetryDelay(retryCount, retryAfterSeconds);
          await this.sleep(delay);
          return this.executeRequest<T>(url, method, bodyString, retryCount + 1);
        }
        throw new DattoSaasProtectionRateLimitError(
          'Rate limit exceeded and max retries reached',
          (retryAfterSeconds ?? 5) * 1000,
          responseBody
        );
      }
      default:
        if (response.status >= 500 && response.status <= 599) {
          // Only GETs are retried: a 5xx on a write (bulkSeatChange PUT) may
          // have been applied upstream, so replaying it blindly is unsafe.
          if (retryCount === 0 && method === 'GET') {
            await this.sleep(1000);
            return this.executeRequest<T>(url, method, bodyString, 1);
          }
          throw new DattoSaasProtectionServerError(
            `Server error: ${response.status} ${response.statusText}`,
            response.status,
            responseBody
          );
        }
        throw new DattoSaasProtectionError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          responseBody
        );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Build a full URL from a base URL, path, and optional query params.
 * Skips parameters whose value is `undefined`.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const base = `${baseUrl}${path}`;
  if (!params) return base;
  const search = new URLSearchParams();
  let any = false;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.append(key, String(value));
    any = true;
  }
  return any ? `${base}?${search.toString()}` : base;
}
