/**
 * Backup reporting:
 *   GET /v1/saas/{saasCustomerId}/applications
 *   GET /v1/saas/{saasCustomerId}/detailedBackupStats
 */

import type { HttpClient } from '../http.js';
import type {
  ApplicationListParams,
  SaasApplicationReport,
  SaasDetailedBackupStats,
} from '../types/applications.js';
import { fetchAllPages } from '../pagination.js';

export class ApplicationsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** Backup history per suite / application for a SaaS customer. */
  async list(
    saasCustomerId: number | string,
    params?: ApplicationListParams
  ): Promise<SaasApplicationReport[]> {
    return fetchAllPages<SaasApplicationReport>(
      this.httpClient,
      `/${encodeURIComponent(String(saasCustomerId))}/applications`,
      {
        daysUntil: params?.daysUntil,
        includeRemoteID:
          params?.includeRemoteID === undefined ? undefined : params.includeRemoteID ? 1 : 0,
      }
    );
  }

  /** Detailed backup statistics for a SaaS customer (returned as-is). */
  async detailedBackupStats(saasCustomerId: number | string): Promise<SaasDetailedBackupStats> {
    return this.httpClient.get<SaasDetailedBackupStats>(
      `/${encodeURIComponent(String(saasCustomerId))}/detailedBackupStats`
    );
  }
}
