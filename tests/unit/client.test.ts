import { describe, it, expect } from 'vitest';
import { DattoSaasProtectionClient } from '../../src/client.js';
import {
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from '../../src/errors.js';
import { lastBulkRequest } from '../mocks/handlers.js';

function makeClient(
  overrides: Partial<ConstructorParameters<typeof DattoSaasProtectionClient>[0]> = {}
): DattoSaasProtectionClient {
  return new DattoSaasProtectionClient({
    publicKey: 'test-public',
    secretKey: 'test-secret',
    rateLimit: { maxRetries: 0, retryAfterMs: 1, enabled: false },
    ...overrides,
  });
}

describe('DattoSaasProtectionClient', () => {
  it('exposes only the documented resource namespaces', () => {
    const c = makeClient() as unknown as Record<string, unknown>;
    expect(c['domains']).toBeDefined();
    expect(c['seats']).toBeDefined();
    expect(c['applications']).toBeDefined();
    for (const removed of ['clients', 'backups', 'restores', 'activity', 'license']) {
      expect(c[removed]).toBeUndefined();
    }
  });

  it('targets https://api.datto.com/v1/saas', () => {
    expect(makeClient().getConfig().apiUrl).toBe('https://api.datto.com/v1/saas');
  });

  it('region "eu" still targets the single documented host (no EU API host exists)', () => {
    expect(makeClient({ region: 'eu' }).getConfig().apiUrl).toBe('https://api.datto.com/v1/saas');
  });

  it('GET /saas/domains with Basic auth returns the bare array', async () => {
    const domains = await makeClient().domains.list();
    expect(domains).toHaveLength(2);
    expect(domains[0]).toMatchObject({
      saasCustomerId: 1001,
      externalSubscriptionId: 'Classic:Office365:1001',
    });
  });

  it('a wrong key pair maps to DattoSaasProtectionAuthenticationError', async () => {
    const c = makeClient({ secretKey: 'wrong' });
    await expect(c.domains.list()).rejects.toBeInstanceOf(DattoSaasProtectionAuthenticationError);
  });

  it('GET /saas/{id}/seats returns seats with remoteId', async () => {
    const seats = await makeClient().seats.list(1001);
    expect(seats).toHaveLength(3);
    expect(seats.map((s) => s.remoteId)).toEqual(['r-a', 'r-s', 'r-x']);
  });

  it('passes seatType as a query filter', async () => {
    const seats = await makeClient().seats.list(1001, { seatType: 'SharedMailbox' });
    expect(seats).toHaveLength(1);
    expect(seats[0]?.seatType).toBe('SharedMailbox');
  });

  it('GET /saas/{id}/applications follows the paged envelope and forwards params', async () => {
    const apps = await makeClient().applications.list(1001, { daysUntil: 7, includeRemoteID: true });
    expect(apps).toHaveLength(2);
    expect(apps.map((a) => (a.suites as Array<{ suiteType: string }>)[0]?.suiteType)).toEqual([
      'suite-1',
      'suite-2',
    ]);
    expect(apps[0]).toMatchObject({ daysUntil: '7', includeRemoteID: '1' });
  });

  it('GET /saas/{id}/detailedBackupStats returns the payload as-is', async () => {
    expect(await makeClient().applications.detailedBackupStats(1001)).toMatchObject({
      tenantId: 't-1',
    });
  });

  it('PUT bulkSeatChange sends the documented snake_case body', async () => {
    const res = await makeClient().seats.bulkChange(1001, 'Classic:Office365:1001', {
      seatType: 'User',
      actionType: 'License',
      ids: ['r-a', ' r-b '],
    });
    expect(Array.isArray(res)).toBe(true);
    expect(lastBulkRequest.url).toBe(
      'https://api.datto.com/v1/saas/1001/Classic%3AOffice365%3A1001/bulkSeatChange'
    );
    expect(lastBulkRequest.body).toEqual({ seat_type: 'User', action_type: 'License', ids: ['r-a', 'r-b'] });
    expect(lastBulkRequest.auth).toMatch(/^Basic /);
  });

  it('bulkSeatChange validates enums, ids, and the 100-seat cap locally', async () => {
    const c = makeClient();
    const sub = 'Classic:Office365:1001';
    await expect(
      // @ts-expect-error case-sensitive enum
      c.seats.bulkChange(1001, sub, { seatType: 'user', actionType: 'License', ids: ['x'] })
    ).rejects.toThrow(/seatType/);
    await expect(
      // @ts-expect-error case-sensitive enum
      c.seats.bulkChange(1001, sub, { seatType: 'User', actionType: 'license', ids: ['x'] })
    ).rejects.toThrow(/actionType/);
    await expect(
      c.seats.bulkChange(1001, sub, { seatType: 'User', actionType: 'Pause', ids: [] })
    ).rejects.toThrow(/at least one/);
    await expect(
      c.seats.bulkChange(1001, sub, {
        seatType: 'User',
        actionType: 'Pause',
        ids: Array.from({ length: 101 }, (_, i) => `id-${i}`),
      })
    ).rejects.toThrow(/at most 100/);
    await expect(
      c.seats.bulkChange(1001, '', { seatType: 'User', actionType: 'Pause', ids: ['x'] })
    ).rejects.toThrow(/externalSubscriptionId/);
  });

  it('maps 401 to DattoSaasProtectionAuthenticationError', async () => {
    await expect(makeClient().seats.list('401')).rejects.toBeInstanceOf(
      DattoSaasProtectionAuthenticationError
    );
  });

  it('maps 403 to DattoSaasProtectionForbiddenError', async () => {
    await expect(makeClient().seats.list('403')).rejects.toBeInstanceOf(
      DattoSaasProtectionForbiddenError
    );
  });

  it('maps 404 to DattoSaasProtectionNotFoundError', async () => {
    await expect(makeClient().seats.list('404')).rejects.toBeInstanceOf(
      DattoSaasProtectionNotFoundError
    );
  });

  it('maps 409 to DattoSaasProtectionConflictError', async () => {
    await expect(
      makeClient().seats.bulkChange('409', 'sub', { seatType: 'User', actionType: 'License', ids: ['x'] })
    ).rejects.toBeInstanceOf(DattoSaasProtectionConflictError);
  });

  it('maps 429 (after retries exhausted) to DattoSaasProtectionRateLimitError', async () => {
    await expect(makeClient().seats.list('429')).rejects.toBeInstanceOf(
      DattoSaasProtectionRateLimitError
    );
  });

  it('maps 500 to DattoSaasProtectionServerError after one retry', async () => {
    await expect(makeClient().applications.detailedBackupStats('500')).rejects.toBeInstanceOf(
      DattoSaasProtectionServerError
    );
  });
});
