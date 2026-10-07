/**
 * `GET /v1/saas/{saasCustomerId}/applications` — backup history per suite /
 * application for a SaaS customer, and
 * `GET /v1/saas/{saasCustomerId}/detailedBackupStats`.
 *
 * Datto does not publish a formal schema outside the authenticated Swagger UI,
 * so these types are permissive (index signatures) and model only the fields
 * observed in public integrations.
 */

export interface SaasBackupHistoryItem {
  timeWindow?: string;
  status?: string;
  startTime?: number;
  endTime?: number;
  totalServiceCount?: number;
  activeServiceCount?: number;
  activeServiceWithBackupCount?: number;
  activeServiceWithPerfectBackupCount?: number;
  [key: string]: unknown;
}

export interface SaasAppType {
  appType?: string;
  backupHistory?: SaasBackupHistoryItem[];
  [key: string]: unknown;
}

export interface SaasSuite {
  suiteType?: string;
  domain?: string;
  externalSubscriptionId?: string;
  appTypes?: SaasAppType[];
  [key: string]: unknown;
}

export interface SaasRemoteIdSummary {
  seatType?: string;
  active?: number;
  paused?: number;
  archived?: number;
  unprotected?: number;
  discovered?: number;
  remoteIds?: string[];
  [key: string]: unknown;
}

export interface SaasApplicationReport {
  customerId?: number;
  customerName?: string;
  usedBytes?: number;
  suites?: SaasSuite[];
  remoteIds?: SaasRemoteIdSummary[];
  [key: string]: unknown;
}

export interface ApplicationListParams {
  /** Number of days of backup history to include (Datto honours up to ~30). */
  daysUntil?: number;
  /** Include remote IDs per seat type in the response. */
  includeRemoteID?: boolean;
}

/** `detailedBackupStats` — free-form; returned as-is. */
export type SaasDetailedBackupStats = Record<string, unknown>;
