/**
 * Main Datto SaaS Protection client.
 */

import type { DattoSaasProtectionConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { HttpClient } from './http.js';
import { RateLimiter } from './rate-limiter.js';
import { DomainsResource } from './resources/domains.js';
import { SeatsResource } from './resources/seats.js';
import { ApplicationsResource } from './resources/applications.js';

/**
 * Datto SaaS Protection client for the documented Datto REST API
 * (`https://api.datto.com/v1/saas/...`).
 *
 * @example
 * ```typescript
 * import { DattoSaasProtectionClient } from '@wyre-ai/node-datto-saas-protection';
 *
 * const client = new DattoSaasProtectionClient({
 *   publicKey: process.env.DATTO_SAAS_PUBLIC_KEY!,
 *   secretKey: process.env.DATTO_SAAS_SECRET_KEY!,
 * });
 *
 * const domains = await client.domains.list();
 * const seats = await client.seats.list(domains[0].saasCustomerId);
 * ```
 */
export class DattoSaasProtectionClient {
  private readonly config: ResolvedConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly httpClient: HttpClient;

  /** `GET /saas/domains` — customers/domains and their IDs. */
  readonly domains: DomainsResource;
  /** `GET /saas/{id}/seats` and `PUT .../bulkSeatChange`. */
  readonly seats: SeatsResource;
  /** `GET /saas/{id}/applications` and `/detailedBackupStats`. */
  readonly applications: ApplicationsResource;

  constructor(config: DattoSaasProtectionConfig) {
    this.config = resolveConfig(config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.httpClient = new HttpClient(this.config, this.rateLimiter);

    this.domains = new DomainsResource(this.httpClient);
    this.seats = new SeatsResource(this.httpClient);
    this.applications = new ApplicationsResource(this.httpClient);
  }

  /** Get the resolved configuration. */
  getConfig(): Readonly<ResolvedConfig> {
    return this.config;
  }
}
