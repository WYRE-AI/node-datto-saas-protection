import { describe, it, expect } from 'vitest';
import {
  resolveConfig,
  REGION_BASE_URLS,
  DEFAULT_API_URL,
  DEFAULT_REGION,
  DEFAULT_RATE_LIMIT_CONFIG,
} from '../../src/config.js';

describe('resolveConfig', () => {
  it('throws when publicKey is missing', () => {
    // @ts-expect-error testing invalid input
    expect(() => resolveConfig({ secretKey: 's' })).toThrow(/publicKey/);
  });

  it('throws when secretKey is missing', () => {
    // @ts-expect-error testing invalid input
    expect(() => resolveConfig({ publicKey: 'p' })).toThrow(/secretKey/);
  });

  it('defaults region to "us"', () => {
    const cfg = resolveConfig({ publicKey: 'p', secretKey: 's' });
    expect(cfg.region).toBe(DEFAULT_REGION);
    expect(cfg.region).toBe('us');
    expect(cfg.apiUrl).toBe('https://api.datto.com/v1/saas');
  });

  it('region: "eu" is accepted but resolves to the single documented host', () => {
    const cfg = resolveConfig({ publicKey: 'p', secretKey: 's', region: 'eu' });
    expect(cfg.region).toBe('eu');
    expect(cfg.apiUrl).toBe(DEFAULT_API_URL);
    expect(REGION_BASE_URLS.eu).toBe(DEFAULT_API_URL);
  });

  it('rejects unsupported regions', () => {
    // @ts-expect-error invalid region literal
    expect(() => resolveConfig({ publicKey: 'p', secretKey: 's', region: 'apac' })).toThrow(/region/);
  });

  it('apiUrl override takes precedence over region', () => {
    const cfg = resolveConfig({
      publicKey: 'p',
      secretKey: 's',
      region: 'us',
      apiUrl: 'https://staging.example.com/v1/saas/',
    });
    expect(cfg.apiUrl).toBe('https://staging.example.com/v1/saas');
  });

  it('merges rateLimit overrides on top of defaults', () => {
    const cfg = resolveConfig({ publicKey: 'p', secretKey: 's', rateLimit: { maxRequests: 30 } });
    expect(cfg.rateLimit.maxRequests).toBe(30);
    expect(cfg.rateLimit.maxConcurrency).toBe(DEFAULT_RATE_LIMIT_CONFIG.maxConcurrency);
  });
});
