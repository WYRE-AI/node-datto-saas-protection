/**
 * `GET /v1/saas/{saasCustomerId}/seats` and
 * `PUT /v1/saas/{saasCustomerId}/{externalSubscriptionId}/bulkSeatChange`.
 */

/**
 * Seat types (case-sensitive, as Datto expects them).
 * Microsoft 365: User, SharedMailbox, Site, TeamSite, Team.
 * Google Workspace: User, SharedDrive.
 */
export type SeatType = 'User' | 'SharedMailbox' | 'SharedDrive' | 'Site' | 'TeamSite' | 'Team';

/** All seat types, for schema/enum generation. */
export const SEAT_TYPES: readonly SeatType[] = [
  'User',
  'SharedMailbox',
  'SharedDrive',
  'Site',
  'TeamSite',
  'Team',
];

/** Seat state as reported by Datto. */
export type SeatState = 'Active' | 'Paused' | 'Archived' | 'Unprotected' | (string & {});

export interface SaasProtectionSeat {
  /** Primary identifier (mailbox address / site URL). */
  mainId?: string;
  name?: string;
  seatType?: SeatType | (string & {});
  seatState?: SeatState;
  billable?: boolean | number | string;
  dateAdded?: string;
  /** Live M365/Google object ID — the value bulkSeatChange `ids` expects. */
  remoteId?: string;
  [key: string]: unknown;
}

export interface SeatListParams {
  /** Filter by seat type (case-sensitive). */
  seatType?: SeatType;
}

/**
 * bulkSeatChange action (case-sensitive).
 * - License: protect the seat (start/resume backups, billable)
 * - Pause: keep existing backups, stop new ones
 * - Unlicense: stop protecting the seat
 */
export type SeatActionType = 'License' | 'Pause' | 'Unlicense';

export const SEAT_ACTION_TYPES: readonly SeatActionType[] = ['License', 'Pause', 'Unlicense'];

/** Datto recommends at most 100 seats per bulkSeatChange call. */
export const MAX_BULK_SEAT_IDS = 100;

export interface BulkSeatChangeRequest {
  seatType: SeatType;
  actionType: SeatActionType;
  /** Remote (live M365/Google) object IDs of the seats to change. */
  ids: string[];
}

/** Per-seat result rows returned by bulkSeatChange (shape not formally documented). */
export interface BulkSeatChangeResult {
  action?: string;
  appType?: string;
  customerId?: number;
  id?: number | string;
  status?: string;
  [key: string]: unknown;
}
