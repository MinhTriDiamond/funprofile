/**
 * Mobile Wallet Deep Link helper
 *
 * Mục đích: khi người dùng dùng WalletConnect trên mobile (browser thường, KHÔNG phải in-app),
 * sau khi gọi sendTransactionAsync, app cần "đẩy" người dùng quay lại app ví để xác nhận.
 *
 * Cơ chế:
 * - Phát hiện connector hiện tại có phải walletConnect không.
 * - Nếu mobile + walletConnect → mở deep-link tương ứng (metamask:, trust:, wc:).
 * - Trên trình duyệt in-app (Trust/MetaMask/Bitget) thì KHÔNG cần — provider injected sẽ tự bật prompt.
 */

import { isInjectedMobileBrowser, isMobileDevice } from './mobileWalletConnect';

export type WalletKind = 'metamask' | 'trust' | 'rainbow' | 'unknown';

/** Nhận diện loại ví dựa trên connector id / name (lowercase). */
export function detectWalletKind(connectorIdOrName?: string | null): WalletKind {
  const v = (connectorIdOrName || '').toLowerCase();
  if (v.includes('metamask') || v === 'io.metamask') return 'metamask';
  if (v.includes('trust')) return 'trust';
  if (v.includes('rainbow')) return 'rainbow';
  return 'unknown';
}

/**
 * Mở app ví trên mobile để user xác nhận giao dịch.
 * - Trên in-app browser: không làm gì (provider injected tự lo).
 * - Trên mobile WalletConnect: thử mở deep-link đặc thù trước; fallback về `wc:` nếu cần.
 *
 * Return true nếu có thử mở deep-link, false nếu bỏ qua.
 */
export function openWalletAppForSigning(opts: {
  connectorId?: string | null;
  connectorName?: string | null;
}): boolean {
  if (typeof window === 'undefined') return false;
  if (!isMobileDevice()) return false;
  // In-app browser: provider tự bật, không cần deep-link
  if (isInjectedMobileBrowser()) return false;

  const kind = detectWalletKind(opts.connectorId || opts.connectorName);

  // Các deep-link "open app" — không có URL → ví sẽ tự load session WalletConnect đang chờ
  const targets: string[] = [];
  if (kind === 'metamask') targets.push('metamask://');
  else if (kind === 'trust') targets.push('trust://');
  else if (kind === 'rainbow') targets.push('rainbow://');

  if (targets.length === 0) return false;

  try {
    // dùng location.href thay vì window.open để mobile tôn trọng deep-link scheme
    window.location.href = targets[0];
    return true;
  } catch {
    return false;
  }
}
