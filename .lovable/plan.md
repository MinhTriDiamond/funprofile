

## Kế hoạch triển khai: Account Linking / Login Methods Upgrade Flow — Phase 1 (Bản chốt cuối)

Đã tích hợp 4 điểm bổ sung cuối cùng từ con.

---

### Bước 1: Database Migration

**A) Thêm cột `has_password`:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password boolean DEFAULT false;
```

**B) Tạo bảng `account_activity_logs`:**
```sql
CREATE TABLE public.account_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.account_activity_logs ENABLE ROW LEVEL SECURITY;
```

**Phân loại quyền insert theo action (điểm bổ sung #1):**

- **Client insert được** (action ít nhạy cảm — user chỉ báo "đã bắt đầu"):
  - `email_link_started`, `email_link_verification_sent`, `wallet_link_started`

- **Server/trusted path insert** (action kết quả thật):
  - `wallet_link_succeeded`, `wallet_link_failed` → ghi từ edge function `connect-external-wallet`
  - `email_link_verified` → ghi từ server-side detect (hoặc RPC)
  - `password_set` → ghi từ DB trigger hoặc RPC sau `updateUser`

RLS policies:
```sql
-- User xem log của mình
CREATE POLICY "Users view own logs" ON account_activity_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Client insert CHỈ cho action ít nhạy cảm
CREATE POLICY "Users insert safe actions" ON account_activity_logs
  FOR INSERT TO authenticated 
  WITH CHECK (
    user_id = auth.uid() 
    AND action IN ('email_link_started', 'email_link_verification_sent', 'wallet_link_started')
  );

-- Admin xem tất cả
CREATE POLICY "Admins view all" ON account_activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

Các action nhạy cảm (`password_set`, `wallet_link_succeeded/failed`, `email_link_verified`) sẽ được insert từ edge function hoặc SECURITY DEFINER RPC.

---

### Bước 2: Edge Function `check-email-exists`

**File**: `supabase/functions/check-email-exists/index.ts`

- Authenticated only (verify JWT từ header)
- **Normalize email**: `trim().toLowerCase()` trước khi query
- Service role query `auth.users` theo email, loại trừ current user
- Trả `{ exists: true/false }`

---

### Bước 3: Hook `useLoginMethods`

**File**: `src/hooks/useLoginMethods.ts`

Dùng `useCurrentUser` + query `profiles` (has_password, external_wallet_address, public_wallet_address).

| Field | Logic |
|---|---|
| `emailExists` | `!!user.email` |
| `emailVerified` | `!!user.email_confirmed_at` |
| `hasEmailLoginMethod` | `emailExists && emailVerified` |
| `hasGoogleIdentity` | `user.app_metadata.providers` chứa 'google' |
| `hasPassword` | `profiles.has_password` |
| `hasWalletLoginMethod` | `!!profile.external_wallet_address` |
| `securityLevel` | Chỉ đếm methods hoạt động thật (verified email, password, wallet linked, google linked) → 1=basic, 2=good, 3+=strong |
| `recommendedAction` | 1 action duy nhất theo priority |
| `isFullySecured` | Tất cả methods khả dụng đã được kích hoạt |

Source of truth: `supabase.auth.getUser()` force refetch khi mount.

---

### Bước 4: Trang `/settings/security`

**File**: `src/pages/SecuritySettings.tsx`

**Card "Mức độ bảo mật"** — Cơ bản/Tốt/Mạnh + progress bar.

**Success state (điểm bổ sung #2)**: Khi `isFullySecured = true`:
- Badge "Mức bảo mật: Mạnh" nổi bật
- Text: "Tài khoản của bạn đang được bảo vệ tốt." ✅
- Tone premium, cảm giác hoàn thiện

**Card "Bước tiếp theo"** — chỉ hiện khi chưa hoàn thiện, 1 CTA chính.

**4 dòng Login Method** — mỗi dòng có mô tả ngắn (điểm bổ sung #3):

| Method | Mô tả | Trạng thái | Action |
|---|---|---|---|
| Email OTP | "Dùng email để nhận mã đăng nhập" | Chưa liên kết / Chờ xác thực / Đã liên kết | Link Email |
| Google | "Đăng nhập nhanh bằng tài khoản Google" | Đã liên kết / Chưa liên kết | "Sẽ hỗ trợ sớm" |
| Mật khẩu | "Đăng nhập nhanh bằng email + mật khẩu" | Đã đặt / Chưa đặt | Set Password |
| Ví | "Đăng nhập bằng ví Web3 của bạn" | Đã liên kết / Chưa liên kết | Link Wallet |

Safety rule: Không cho gỡ phương thức đăng nhập cuối cùng.

Detect email verified: Force `getUser()` khi mount + `onAuthStateChange` `USER_UPDATED`.

Thêm route `/settings/security` vào `App.tsx`. Thêm link "Bảo mật" vào `FacebookLeftSidebar` (shortcutItems, icon `Shield`).

---

### Bước 5: Security Dialogs

**`SetPasswordDialog.tsx`** — `updateUser({ password })` → update `has_password = true` → log `password_set` (server-side) → auto gợi ý bước tiếp.

**`LinkEmailDialog.tsx`** — Normalize email → `check-email-exists` → `updateUser({ email })` → UI "Chờ xác thực" + **nút "Gửi lại email xác thực"** + text "Kiểm tra spam nếu chưa thấy email".

**`LinkWalletDialog.tsx`** — Connect → ký message → `connect-external-wallet` → log từ edge function.

---

### Bước 6: `AccountUpgradeBanner`

**File**: `src/components/security/AccountUpgradeBanner.tsx`

Hiển thị ở Feed + Profile (own). Text cụ thể theo nhóm user.

**Cooldown riêng theo action (điểm bổ sung #4)**:
- localStorage key: `dismiss_security_{action}_{timestamp}`
- Mỗi action dismiss riêng biệt, nhắc lại sau 7 ngày
- Ví dụ: dismiss `set_password` không ảnh hưởng hiển thị `link_wallet`

---

### Bước 7: Cập nhật `has_password` ở flow hiện có

- `ResetPassword.tsx`: sau reset → `has_password = true`
- `ClassicEmailLogin.tsx`: sau signup email+password → `has_password = true`
- `SetPassword.tsx`: sau set → `has_password = true`

---

### Tổng kết files

| Loại | File |
|---|---|
| **Migration** | `has_password` column + `account_activity_logs` table |
| **Tạo mới** | `src/hooks/useLoginMethods.ts` |
| | `src/pages/SecuritySettings.tsx` |
| | `src/components/security/SetPasswordDialog.tsx` |
| | `src/components/security/LinkEmailDialog.tsx` |
| | `src/components/security/LinkWalletDialog.tsx` |
| | `src/components/security/AccountUpgradeBanner.tsx` |
| | `supabase/functions/check-email-exists/index.ts` |
| **Sửa** | `src/App.tsx` — thêm route `/settings/security` |
| | `src/pages/Feed.tsx` — thêm banner |
| | `src/pages/Profile.tsx` — thêm banner own profile |
| | `src/pages/ResetPassword.tsx` — update `has_password` |
| | `src/components/auth/ClassicEmailLogin.tsx` — update `has_password` |
| | `src/components/feed/FacebookLeftSidebar.tsx` — thêm link Bảo mật |

