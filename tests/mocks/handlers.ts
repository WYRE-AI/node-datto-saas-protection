/**
 * MSW handlers mocking the documented Datto REST API SaaS Protection surface:
 *   GET /v1/saas/domains
 *   GET /v1/saas/{saasCustomerId}/seats
 *   GET /v1/saas/{saasCustomerId}/applications
 *   GET /v1/saas/{saasCustomerId}/detailedBackupStats
 *   PUT /v1/saas/{saasCustomerId}/{externalSubscriptionId}/bulkSeatChange
 *
 * Any other path is unhandled, and tests/setup.ts fails on unhandled requests,
 * so a regression back to an invented route (e.g. /clients) fails loudly.
 */

import { http, HttpResponse } from 'msw';

const BASE = 'https://api.datto.com/v1/saas';
const EXPECTED_AUTH = `Basic ${Buffer.from('test-public:test-secret').toString('base64')}`;

/** Last bulkSeatChange request seen, for body assertions. */
export const lastBulkRequest: { url?: string; body?: unknown; auth?: string | null } = {};

/** Number of requests per path, for retry assertions. */
export const requestCounts = new Map<string, number>();

function errorFor(id: string): Response | undefined {
  switch (id) {
    case '401':
      return HttpResponse.json({ code: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    case '403':
      return HttpResponse.json({ message: 'forbidden' }, { status: 403 });
    case '404':
      return HttpResponse.json(
        { code: 'exception.notfoundhttpexception', message: 'Not Found' },
        { status: 404 }
      );
    case '409':
      return HttpResponse.json({ message: 'conflict' }, { status: 409 });
    case '429':
      return HttpResponse.json(
        { message: 'slow down' },
        { status: 429, headers: { 'Retry-After': '0' } }
      );
    case '500':
      return HttpResponse.json({ message: 'boom' }, { status: 500 });
    default:
      return undefined;
  }
}

export const handlers = [
  http.get(`${BASE}/domains`, ({ request }) => {
    if (request.headers.get('authorization') !== EXPECTED_AUTH) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json([
      {
        saasCustomerId: 1001,
        saasCustomerName: 'Acme Co',
        domain: 'acme.com',
        productType: 'Office365',
        externalSubscriptionId: 'Classic:Office365:1001',
        retentionType: 'Infinite',
        seatsUsed: 42,
        organizationId: 7,
        organizationName: 'Acme',
        backupStats: { activeServicesCount: 10, activeServicesWithRecentBackupCount: 9, backupPercentage: 90 },
      },
      {
        saasCustomerId: 1002,
        saasCustomerName: 'Beta Inc',
        domain: 'beta.io',
        productType: 'GoogleApps',
        externalSubscriptionId: 'Classic:GoogleApps:1002',
        seatsUsed: 5,
      },
    ]);
  }),

  http.get(`${BASE}/:customerId/seats`, ({ params, request }) => {
    const id = String(params['customerId']);
    const err = errorFor(id);
    if (err) return err;
    const seats = [
      { mainId: 'a@acme.com', name: 'Alice', seatType: 'User', seatState: 'Active', billable: 1, remoteId: 'r-a' },
      { mainId: 'shared@acme.com', name: 'Shared', seatType: 'SharedMailbox', seatState: 'Unprotected', billable: 0, remoteId: 'r-s' },
      { mainId: 'https://acme.sharepoint.com/sites/x', name: 'X', seatType: 'Site', seatState: 'Paused', billable: 1, remoteId: 'r-x' },
    ];
    const seatType = new URL(request.url).searchParams.get('seatType');
    return HttpResponse.json(seatType !== null && seatType !== '' ? seats.filter((s) => s.seatType === seatType) : seats);
  }),

  // Paged envelope across two pages (exercises _page/_perPage following).
  http.get(`${BASE}/:customerId/applications`, ({ params, request }) => {
    const id = String(params['customerId']);
    const err = errorFor(id);
    if (err) return err;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('_page') ?? '1');
    const report = (n: number): Record<string, unknown> => ({
      customerId: Number(id),
      customerName: `Customer ${id}`,
      daysUntil: url.searchParams.get('daysUntil'),
      includeRemoteID: url.searchParams.get('includeRemoteID'),
      suites: [{ suiteType: `suite-${n}`, appTypes: [{ appType: 'Exchange', backupHistory: [] }] }],
    });
    return HttpResponse.json({
      pagination: { page, perPage: 1, totalPages: 2, count: 2 },
      items: [report(page)],
    });
  }),

  http.get(`${BASE}/:customerId/detailedBackupStats`, ({ params, request }) => {
    const id = String(params['customerId']);
    const key = `GET ${new URL(request.url).pathname}`;
    requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
    const err = errorFor(id);
    if (err) return err;
    return HttpResponse.json({ tenantId: 't-1', numberOfUsers: 12, region: 'us' });
  }),

  http.put(`${BASE}/:customerId/:subscriptionId/bulkSeatChange`, async ({ params, request }) => {
    const id = String(params['customerId']);
    const key = `PUT ${new URL(request.url).pathname}`;
    requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
    const err = errorFor(id);
    if (err) return err;
    lastBulkRequest.url = request.url;
    lastBulkRequest.auth = request.headers.get('authorization');
    lastBulkRequest.body = await request.json();
    const body = lastBulkRequest.body as { ids: string[]; action_type: string };
    return HttpResponse.json(
      body.ids.map((rid, i) => ({ id: i + 1, action: body.action_type, status: 'success', remoteId: rid }))
    );
  }),
];
