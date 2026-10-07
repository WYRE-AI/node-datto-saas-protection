# @wyre-ai/node-datto-saas-protection

Fully-typed Node.js / TypeScript client for the **SaaS Protection endpoints of
the documented Datto REST API** (`https://api.datto.com/v1/saas`).

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> **v3 re-grounds the library on Datto's documented API.** Earlier versions
> called `/clients`, `/clients/{id}/domains`, `/seats/{id}/backups` and
> `/restores`, none of which exist in Datto's API (they return
> `404 exception.notfoundhttpexception` regardless of credentials). Those
> resources are removed.

## Endpoints covered

| Method | Path | Client method |
|---|---|---|
| GET | `/v1/saas/domains` | `client.domains.list()` |
| GET | `/v1/saas/{saasCustomerId}/seats` | `client.seats.list(saasCustomerId, { seatType? })` |
| GET | `/v1/saas/{saasCustomerId}/applications` | `client.applications.list(saasCustomerId, { daysUntil?, includeRemoteID? })` |
| GET | `/v1/saas/{saasCustomerId}/detailedBackupStats` | `client.applications.detailedBackupStats(saasCustomerId)` |
| PUT | `/v1/saas/{saasCustomerId}/{externalSubscriptionId}/bulkSeatChange` | `client.seats.bulkChange(saasCustomerId, externalSubscriptionId, { seatType, actionType, ids })` |

References: [Using the Datto REST API for SaaS Protection](https://saasprotection.datto.com/help/M365/Content/Other_Administrative_Tasks/using-rest-api-saas-protection.htm)
and the authenticated Swagger UI in the Datto Partner Portal (Admin > Integrations > API Keys > Documentation).

## Install

```bash
npm install @wyre-ai/node-datto-saas-protection
```

(Published to GitHub Packages: add `@wyre-ai:registry=https://npm.pkg.github.com` to `.npmrc`.)

## Quick start

```typescript
import { DattoSaasProtectionClient } from '@wyre-ai/node-datto-saas-protection';

const client = new DattoSaasProtectionClient({
  publicKey: process.env.DATTO_SAAS_PUBLIC_KEY!,
  secretKey: process.env.DATTO_SAAS_SECRET_KEY!,
});

// 1. Customers / domains — gives saasCustomerId + externalSubscriptionId
const domains = await client.domains.list();

// 2. Seats for a customer (remoteId is what bulkSeatChange takes)
const seats = await client.seats.list(domains[0].saasCustomerId, { seatType: 'User' });

// 3. Backup history per application
const apps = await client.applications.list(domains[0].saasCustomerId, { daysUntil: 7 });

// 4. WRITE: license / pause / unlicense up to 100 seats
await client.seats.bulkChange(domains[0].saasCustomerId, domains[0].externalSubscriptionId!, {
  seatType: 'User',          // User | SharedMailbox | SharedDrive | Site | TeamSite | Team (case-sensitive)
  actionType: 'License',     // License | Pause | Unlicense (case-sensitive)
  ids: seats.slice(0, 10).map((s) => s.remoteId!),
});
```

## Authentication and host

The Datto REST API uses HTTP Basic auth with the public/secret API key pair
from the Datto Partner Portal. There is a single API host, `api.datto.com`;
Datto does not publish a regional SaaS Protection API host (`api.eu.datto.com`
does not resolve). The `region` option is still accepted for backward
compatibility but has no effect.

## Pagination

`/domains` and `/seats` return bare arrays. Endpoints that answer with Datto's
paged envelope (`{ pagination: { page, perPage, totalPages }, items }`) are
followed automatically with `_page` / `_perPage`. All list methods return a
flat array.

## Error handling

```typescript
import {
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionRateLimitError,
} from '@wyre-ai/node-datto-saas-protection';

try {
  await client.seats.list(12345);
} catch (err) {
  if (err instanceof DattoSaasProtectionAuthenticationError) {
    // 401: bad / inactive key pair
  } else if (err instanceof DattoSaasProtectionNotFoundError) {
    // 404: unknown saasCustomerId / externalSubscriptionId
  } else if (err instanceof DattoSaasProtectionRateLimitError) {
    await new Promise((r) => setTimeout(r, err.retryAfter));
  }
}
```

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

## License

Apache-2.0
