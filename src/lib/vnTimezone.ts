/**
 * Helper functions for Vietnam timezone (UTC+7) calculations.
 * Used across Gift Celebration and Donation History to ensure consistent date ranges.
 */

/** Get today's date string in VN timezone (YYYY-MM-DD) */
export function getTodayVN(): string {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
}

/** Convert a VN date string (YYYY-MM-DD) to a UTC ISO range { start, end } */
export function vnDateToUtcRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const vnMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const utcStart = new Date(vnMidnight.getTime() - 7 * 60 * 60 * 1000);
  const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);
  return { start: utcStart.toISOString(), end: utcEnd.toISOString() };
}

/** Get today's full UTC range in VN timezone */
export function getVNTodayRange(): { start: string; end: string; dateStr: string } {
  const dateStr = getTodayVN();
  const { start, end } = vnDateToUtcRange(dateStr);
  return { start, end, dateStr };
}
