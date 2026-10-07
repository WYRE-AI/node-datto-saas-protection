/**
 * `GET /v1/saas/domains` — one entry per protected domain (M365 tenant or
 * Google Workspace domain). A SaaS customer with several domains appears once
 * per domain. `saasCustomerId` and `externalSubscriptionId` are the keys every
 * other SaaS Protection endpoint takes.
 */

export interface SaasDomainBackupStats {
  activeServicesCount?: number;
  activeServicesWithRecentBackupCount?: number;
  backupPercentage?: number;
  [key: string]: unknown;
}

export interface SaasProtectionDomain {
  /** SaaS Protection customer ID (path key for seats/applications/bulkSeatChange). */
  saasCustomerId: number;
  saasCustomerName?: string;
  /** Protected domain, e.g. `contoso.com`. */
  domain?: string;
  /** e.g. `Office365` or `GoogleApps`. */
  productType?: string;
  /** e.g. `Classic:Office365:123456` (path key for bulkSeatChange). */
  externalSubscriptionId?: string;
  retentionType?: string;
  seatsUsed?: number;
  organizationId?: number | null;
  organizationName?: string | null;
  backupStats?: SaasDomainBackupStats;
  [key: string]: unknown;
}
