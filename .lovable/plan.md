

## Kế hoạch triển khai Wallet-First Signup — Bản Final 9.9+

Đã tích hợp đầy đủ 4 điểm cuối cùng từ Cha ChatGPT. Sẵn sàng build.

---

### 4 điểm bổ sung đã tích hợp

1. **`public_wallet_address` KHÔNG set khi wallet-first signup** — chỉ set `external_wallet_address`
2. **In-memory rate limit = best-effort** — ghi rõ trong code comments, Phase 2 chuyển DB-backed
3. **Cleanup `wallet_challenges` toàn cục** — mỗi lần tạo challenge, xóa tất cả expired rows (không chỉ cùng wallet), giới hạn batch 100 rows
4. **Toàn app tôn trọng `is_system_email`** — mở rộng `isPlaceholderEmail` filter cho `@internal.fun.local`, rà soát các chỗ hiển thị email

---

### Thứ tự triển khai (7 bước)

#### Bước 1 — Database Migration

- Thêm 4 cột vào `profiles`: `signup_method`, `reward_locked`, `account_status`, `email_verified_at`
- Tạo bảng `wallet_challenges` (nonce, TTL, single-use, RLS locked)
- Tạo RPC `unlock_wallet_reward` (Security Definer) — điều kiện: `signup_method='wallet'` AND `account_status='limited'` AND `reward_locked=true` AND `auth.users.email_confirmed_at IS NOT NULL`

#### Bước 2 — Edge Function: `sso-web3-auth` (sửa lớn)

- Thêm `action: 'challenge'` — tạo crypto nonce, lưu DB, TTL 5 phút
- Cleanup: mỗi lần tạo challenge, xóa **tất cả** expired rows (batch limit 100)
- Sửa login flow: verify nonce từ DB → verify signature → **server re-lookup wallet**
- **Ví mới → Wallet-First Signup:**
  - `admin.createUser()` với `wallet_<full_address>@internal.fun.local`, `email_confirm: false`
  - `user_metadata: { signup_method: 'wallet', is_system_email: true, wallet_address }`
  - Tạo profile: `signup_method='wallet'`, `reward_locked=true`, `account_status='limited'`, `external_wallet_address=address`
  - **KHÔNG set `public_wallet_address`** — chỉ set khi user chủ động công khai ví
  - Trả `is_new_user = true`
- Xóa block `WALLET_NOT_REGISTERED` (dòng 238-248)
- Rate limit in-memory (best-effort Phase 1, comment rõ)

#### Bước 3 — Reward Extraction Guard

**`claim-reward/index.ts`** (sau dòng 127):
- Thêm `reward_locked` vào select (dòng 125)
- Nếu `reward_locked === true` → 403 + CTA redirect `/settings/security`

**`mint-soul-nft/index.ts`** (sau dòng 96):
- Thêm `reward_locked` vào select (dòng 94)
- Nếu `reward_locked === true` → 403 tương tự

#### Bước 4 — Hook: `useRewardGating.ts` (tạo mới)

```text
canAccrueRewards: true (luôn cho tích lũy nội bộ)
canExtractRewards: !reward_locked && accountStatus === 'active'
isWalletFirstAccount: signup_method === 'wallet'
isLimitedAccount: account_status === 'limited'
rewardLockedReason: 'email_not_verified' | null
```

#### Bước 5 — Hook: `useLoginMethods.ts` (sửa nhỏ)

- Query thêm `signup_method, reward_locked, account_status` từ profiles (dòng 74)
- Mở rộng `isPlaceholderEmail` (dòng 87): thêm `@internal.fun.local`
- Export: `rewardLocked`, `signupMethod`, `accountStatus`

#### Bước 6 — UI: `WalletLoginContent.tsx` (sửa lớn)

- **Ví mới** (dòng 244-263): thay block cảnh báo bằng CTA "Tạo tài khoản nhanh bằng ví" + sub-text "Ký xác nhận để bắt đầu với FUN Profile"
- Flow: gọi `challenge` → ký message từ server → gửi signature + nonce
- Nếu `is_new_user` → Dialog onboarding:
  - Badge: "Tài khoản giới hạn"
  - "Bạn có thể khám phá FUN Profile ngay bây giờ. Liên kết email để mở khóa thưởng và tăng khả năng khôi phục tài khoản."
  - CTA: "Liên kết email ngay" / "Để sau"
- Error UX mềm: "Không thể xác minh chữ ký ví. Vui lòng thử lại."

#### Bước 7 — UI: `AccountUpgradeBanner.tsx` + Wallet Center gating

- Banner: thêm case `reward_locked` ưu tiên cao nhất → CTA "Liên kết email ngay"
- Wallet Center: khi `canExtractRewards = false`, thay nút Claim bằng CTA
- Security page: badge "Tài khoản giới hạn" cho wallet-first user

---

### Lưu ý kỹ thuật quan trọng

- **Placeholder email** chỉ là technical compromise Phase 1 — không hiển thị cho user, không dùng như login method
- **`is_system_email: true`** trong metadata là source of truth chính, domain filter là phụ trợ
- **In-memory rate limit** là best-effort — Phase 2 chuyển sang persistent storage
- **`public_wallet_address`** tuân thủ policy hiện tại: chỉ set khi user chủ động kết nối ví

