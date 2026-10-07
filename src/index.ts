/**
 * @wyre-ai/node-datto-saas-protection
 *
 * Fully-typed Node.js/TypeScript client for the Datto SaaS Protection
 * endpoints of the documented Datto REST API (`https://api.datto.com/v1/saas`).
 */

// Main client
export { DattoSaasProtectionClient } from './client.js';

// Configuration
export type {
  DattoSaasProtectionConfig,
  DattoSaasProtectionRegion,
  RateLimitConfig,
  ResolvedConfig,
} from './config.js';
export {
  DEFAULT_API_URL,
  DEFAULT_REGION,
  DEFAULT_RATE_LIMIT_CONFIG,
  REGION_BASE_URLS,
} from './config.js';

// Errors
export {
  DattoSaasProtectionError,
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from './errors.js';

// HTTP helper (exported for advanced users / testing)
export { buildUrl } from './http.js';

// Pagination
export {
  clampLimit,
  extractItems,
  fetchAllPages,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MAX_PAGES,
} from './pagination.js';
export type { DattoPagination, DattoPagedResponse } from './pagination.js';

// Resource classes (for typing)
export { DomainsResource } from './resources/domains.js';
export { SeatsResource } from './resources/seats.js';
export { ApplicationsResource } from './resources/applications.js';

// Types
export * from './types/index.js';
