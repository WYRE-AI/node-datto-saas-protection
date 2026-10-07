import { describe, it, expect } from 'vitest';
import {
  clampLimit,
  extractItems,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '../../src/pagination.js';
import { buildUrl } from '../../src/http.js';

describe('clampLimit', () => {
  it('returns default when undefined', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_PAGE_LIMIT);
  });

  it('floors values below 1 to 1', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-50)).toBe(1);
  });

  it('caps values above MAX_PAGE_LIMIT', () => {
    expect(clampLimit(10_000)).toBe(MAX_PAGE_LIMIT);
  });

  it('passes valid values through (floored)', () => {
    expect(clampLimit(120)).toBe(120);
    expect(clampLimit(50.7)).toBe(50);
  });
});

describe('buildUrl', () => {
  it('returns base+path when no params', () => {
    expect(buildUrl('https://x', '/domains')).toBe('https://x/domains');
  });

  it('omits undefined params', () => {
    expect(buildUrl('https://x', '/domains', { a: 1, b: undefined })).toBe(
      'https://x/domains?a=1'
    );
  });

  it('returns base+path when all params are undefined', () => {
    expect(buildUrl('https://x', '/domains', { a: undefined })).toBe('https://x/domains');
  });

  it('serializes booleans as "true"/"false"', () => {
    expect(buildUrl('https://x', '/seats', { includeRemoteID: true })).toBe(
      'https://x/seats?includeRemoteID=true'
    );
  });
});

describe('extractItems', () => {
  it('accepts a bare array', () => {
    expect(extractItems([1, 2])).toEqual([1, 2]);
  });
  it('accepts a Datto paged envelope', () => {
    expect(extractItems({ pagination: { page: 1, totalPages: 1 }, items: ['a'] })).toEqual(['a']);
  });
  it('returns [] for anything else', () => {
    expect(extractItems(null)).toEqual([]);
    expect(extractItems({ foo: 1 })).toEqual([]);
  });
});
