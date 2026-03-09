

## Kế hoạch: Bỏ bước dán ví + Hardening bảo mật

### Thay đổi 1 — Frontend: `src/components/auth/WalletLoginContent.tsx`

Bỏ hoàn toàn bước nhập/dán địa chỉ ví. Flow mới:

```text
[Bấm "Kết nối ví"] → RainbowKit modal → Ví kết nối → Tự động challenge + sign → Login
```

- Xóa state `pastedAddress`, `walletStatus`, `step` (input/checked)
- Xóa `checkWalletRegistration` (action `check` không cần nữa)
- Xóa `<Input>` và nút "Kiểm Tra Ví"
- Chỉ còn 1 nút "Kết nối ví" → mở `openConnectModal()`
- Khi `isConnected && address` → tự động gọi `handleSignAndVerify()` với `address` từ wagmi (ví thực tế)
- **CRITICAL**: Toàn bộ flow dùng `address` (wagmi), KHÔNG BAO GIỜ dùng input từ user

### Thay đổi 2 — Backend: `supabase/functions/sso-web3-auth/index.ts`

3 hardening:

1. **Challenge-wallet match**: Sau khi lookup challenge, kiểm tra `challenge.wallet_address === normalizedAddress`. Reject nếu không khớp + log `suspicious_wallet_login_attempt`.

2. **Message integrity**: Kiểm tra `challenge.message === message`. Reject nếu client gửi message khác.

3. **Ethers import ổn định**: Đổi từ CDN (`https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm`) sang `npm:ethers@6` cho Deno.

4. **Audit logs** cho các failure case: `wallet_login_failed_invalid_signature`, `wallet_login_failed_invalid_nonce`, `wallet_login_failed_challenge_mismatch`.

### Tác động sau fix

- User chỉ cần bấm 1 nút → kết nối ví thật → ký → xong
- Không thể nhập địa chỉ ví người khác vì không có input
- Server double-check challenge được tạo cho đúng ví đang request login
- Signature verification dùng import ổn định

