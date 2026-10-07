/**
 * `GET /v1/saas/domains` — list every SaaS Protection customer/domain the API
 * key can see.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionDomain } from '../types/domains.js';
import { fetchAllPages } from '../pagination.js';

export class DomainsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List all protected domains (one row per domain, carrying saasCustomerId). */
  async list(): Promise<SaasProtectionDomain[]> {
    return fetchAllPages<SaasProtectionDomain>(this.httpClient, '/domains');
  }
}
