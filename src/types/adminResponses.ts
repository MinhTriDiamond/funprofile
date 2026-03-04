/**
 * Typed interfaces for admin edge function responses.
 * Replaces `any` in SystemTab, DonationHistoryAdminTab, etc.
 */

/** Response from auto-backfill-donations edge function (scan mode) */
export interface BackfillScanResult {
  total_scanned: number;
  summary?: {
    missing_donations_count: number;
    missing_posts_count: number;
    recoverable_donations: number;
    unrecoverable_donations: number;
  };
  missing_donations?: Array<{
    sender_username: string;
    recipient_username: string | null;
    amount: string;
    token_symbol: string;
    tx_hash: string;
    created_at: string;
    can_recover: boolean;
  }>;
}

/** Response from auto-backfill-donations edge function (backfill mode) */
export interface BackfillResult {
  inserted: number;
  skipped?: number;
  errors?: string[];
}

/** Response from batch-delete-banned-users edge function */
export interface DeleteBannedResult {
  deleted: number;
  message?: string;
}

/** Unmappable transaction from donation scan */
export interface UnmappableTransaction {
  id: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: string;
  token_symbol: string;
  created_at: string;
  reason?: string;
}
