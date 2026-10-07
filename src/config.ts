/**
 * Configuration types and defaults for the Datto SaaS Protection client.
 */

/**
 * Accepted region values.
 *
 * Datto publishes ONE REST API host for SaaS Protection: `https://api.datto.com`
 * (the same host as the BCDR `/v1/bcdr/...` surface). There is no regional
 * SaaS Protection API host — `api.eu.datto.com` does not resolve in public DNS
 * (NXDOMAIN, verified 2026-10-07) and the Datto REST API docs list only
 * `api.datto.com`.
 *
 * `region` is retained so existing callers (and stored gateway credentials
 * that carry `region: "eu"`) keep working, but it no longer changes the host.
 *
 * @deprecated The region has no effect; every request goes to api.datto.com.
 */
export type DattoSaasProtectionRegion = 'us' | 'eu';

/** Datto REST API base for SaaS Protection endpoints. */
export const DEFAULT_API_URL = 'https://api.datto.com/v1/saas';

/**
 * Per-region base URLs. Both regions map to the single documented host.
 *
 * @deprecated Kept for backward compatibility; use {@link DEFAULT_API_URL}.
 */
export const REGION_BASE_URLS: Readonly<Record<DattoSaasProtectionRegion, string>> = {
  us: DEFAULT_API_URL,
  eu: DEFAULT_API_URL,
};

/** Default region if none is supplied. */
export const DEFAULT_REGION: DattoSaasProtectionRegion = 'us';

/**
 * Rate limiting configuration.
 *
 * The defaults here are intentionally conservative (60 requests/minute,
 * concurrency capped at 4) and back off on 429.
 */
export interface RateLimitConfig {
  /** Whether rate limiting is enabled (default: true) */
  enabled: boolean;
  /** Maximum requests per window (default: 60) */
  maxRequests: number;
  /** Window duration in milliseconds (default: 60000) */
  windowMs: number;
  /** Threshold percentage to start throttling (default: 0.8 = 80%) */
  throttleThreshold: number;
  /** Default delay between retries on 429 (default: 5000ms) */
  retryAfterMs: number;
  /** Maximum retry attempts on rate limit errors (default: 3) */
  maxRetries: number;
  /** Maximum concurrent in-flight requests (default: 4) */
  maxConcurrency: number;
}

/** Default rate limit configuration. */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  maxRequests: 60,
  windowMs: 60_000,
  throttleThreshold: 0.8,
  retryAfterMs: 5_000,
  maxRetries: 3,
  maxConcurrency: 4,
};

/**
 * Configuration for the Datto SaaS Protection client.
 *
 * The Datto REST API uses HTTP Basic auth with the public/secret API key pair
 * created in the Datto Partner Portal (Admin > Integrations > API Keys).
 */
export interface DattoSaasProtectionConfig {
  /** Public API key from the Datto Partner Portal. */
  publicKey: string;
  /** Secret API key from the Datto Partner Portal. */
  secretKey: string;
  /**
   * Accepted for backward compatibility; has no effect.
   * @deprecated There is a single Datto REST API host.
   */
  region?: DattoSaasProtectionRegion;
  /**
   * Override the API base URL (default `https://api.datto.com/v1/saas`).
   * Intended for tests / proxies.
   */
  apiUrl?: string;
  /** Rate limiting configuration overrides. */
  rateLimit?: Partial<RateLimitConfig>;
}

/** Resolved configuration with defaults applied. */
export interface ResolvedConfig {
  publicKey: string;
  secretKey: string;
  region: DattoSaasProtectionRegion;
  apiUrl: string;
  rateLimit: RateLimitConfig;
}

/** Resolve a {@link DattoSaasProtectionConfig} by applying defaults. */
export function resolveConfig(config: DattoSaasProtectionConfig): ResolvedConfig {
  if (!config.publicKey) {
    throw new Error('publicKey must be provided');
  }
  if (!config.secretKey) {
    throw new Error('secretKey must be provided');
  }
  const region = config.region ?? DEFAULT_REGION;
  if (region !== 'us' && region !== 'eu') {
    throw new Error(`Unsupported region: ${String(region)} (expected "us" or "eu")`);
  }
  const apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, '');
  return {
    publicKey: config.publicKey,
    secretKey: config.secretKey,
    region,
    apiUrl,
    rateLimit: {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...config.rateLimit,
    },
  };
}
