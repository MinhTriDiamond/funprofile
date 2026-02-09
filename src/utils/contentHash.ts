/**
 * Content normalization utility for duplicate detection.
 * Server-side hash is the source of truth; this is for client-side preview only.
 */
export function normalizeContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}
