

# Kế Hoạch Bridge FUN Profile ↔ Angel AI

## Tổng Quan

FUN Profile đã có hạ tầng SSO hoàn chỉnh (11 Edge Functions + SDK v1.1.0 + OAuth 2.0 PKCE). Angel AI chỉ cần được đăng ký làm client và implement phía nhận. Phía FUN Profile gần như không cần thay đổi code.

---

## PHẦN 1: FUN Profile Cần Làm Gì

### Việc 1 (Bé Trí làm): Không có gì

Không cần làm gì thủ công. Mọi thứ Cha Lovable sẽ xử lý.

### Việc 2 (Cha Lovable FUN Profile làm): Đăng ký `angel_ai_client`

Thêm 1 row vào bảng `oauth_clients`:

```sql
INSERT INTO oauth_clients (
  client_id,
  client_secret,   -- NULL = chỉ dùng PKCE, không cần secret
  redirect_uris,
  allowed_scopes,
  platform_name,
  description,
  is_active
) VALUES (
  'angel_ai_client',
  NULL,
  ARRAY[
    'https://angel.fun.rich/auth/callback',
    'https://angel999.lovable.app/auth/callback'
  ],
  ARRAY['profile', 'email', 'wallet', 'soul', 'rewards', 'platform_data'],
  'Angel AI',
  'Tro ly AI thong minh trong Fun Ecosystem',
  true
);
```

**Chi tiết kỹ thuật:**
- `client_secret = NULL`: Vì SDK dùng PKCE S256, không bắt buộc client_secret. Code trong `sso-token` (dòng 101-114) đã xử lý trường hợp này: nếu DB không có `client_secret` thì bỏ qua kiểm tra.
- `allowed_scopes`: Tất cả 6 scopes theo yêu cầu của con.
- Không cần sửa code Edge Function nào. Tất cả 11 SSO functions đã hoạt động.

### Việc 3 (Cha Lovable FUN Profile làm): Xác nhận `FUN_PROFILE_ORIGIN`

Secret `FUN_PROFILE_ORIGIN` đã tồn tại trong env. Cha sẽ xác nhận giá trị hiện tại là `https://fun.rich` (dùng trong `sso-authorize` dòng 106 khi redirect user chưa login về trang đăng nhập FUN Profile).

**Tổng kết phía FUN Profile: Chỉ 1 lệnh SQL INSERT. Không thay đổi code.**

---

## PHẦN 2: Kế Hoạch Gửi Angel AI

### Thông tin kỹ thuật Angel AI cần biết

```text
============================================
THONG TIN KET NOI SSO - FUN PROFILE
============================================

1. Client ID:          angel_ai_client
2. Client Secret:      Khong can (dung PKCE S256)
3. API Base URL:       https://bhtsnervqiwchluwuxki.supabase.co/functions/v1

4. Endpoints:
   - Authorize:        /sso-authorize
   - Token exchange:   /sso-token
   - Verify token:     /sso-verify
   - Refresh token:    /sso-refresh
   - Revoke token:     /sso-revoke
   - Sync data:        /sso-sync-data
   - Sync financial:   /sso-sync-financial

5. Redirect URIs da dang ky:
   - https://angel.fun.rich/auth/callback
   - https://angel999.lovable.app/auth/callback

6. Scopes kha dung:
   - profile    (username, full_name, avatar_url, bio)
   - email      (email address)
   - wallet     (wallet_address, external_wallet, custodial_wallet)
   - soul       (soul_element, soul_level, NFT data)
   - rewards    (pending_reward, approved_reward, total_rewards)
   - platform_data (data dong bo rieng cua Angel)

7. Token format:
   - access_token: JWT (HS256), TTL 1 gio
   - refresh_token: opaque string, TTL 30 ngay

8. PKCE:
   - Method: S256
   - SDK da implement san generateCodeVerifier() va generateCodeChallenge()

9. SDK:
   - npm install @fun-ecosystem/sso-sdk (v1.1.0)
   - Zero dependencies
   - TypeScript first
```

### Cha Lovable Angel AI lam gi (3 buoc)

**Buoc 1: Cai SDK + Khoi tao client**

```typescript
// src/lib/funProfile.ts
import { FunProfileClient, SessionStorageAdapter } from '@fun-ecosystem/sso-sdk';

export const funProfile = new FunProfileClient({
  clientId: 'angel_ai_client',
  redirectUri: window.location.origin + '/auth/callback',
  scopes: ['profile', 'email', 'wallet', 'soul', 'rewards', 'platform_data'],
  storage: new SessionStorageAdapter('angel_ai_client'),
});
```

**Buoc 2: Tao route `/auth/callback`**

Page nhan `code` + `state` tu redirect:

```typescript
// Trong /auth/callback page
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');

if (code && state) {
  // SDK tu dong exchange code -> access_token (voi PKCE verify)
  const result = await funProfile.handleCallback(code, state);
  // result.user chua: id, funId, username, email, avatar, wallet, soul, rewards

  // Gui access_token len Angel Edge Function de tao Supabase session
  const response = await fetch('/functions/v1/bridge-login', {
    method: 'POST',
    body: JSON.stringify({ fun_access_token: result.tokens.accessToken })
  });
  const { session } = await response.json();
  // Set Angel Supabase session
}
```

**Buoc 3: Tao Edge Function `bridge-login` (phia Angel)**

```text
Input:  { fun_access_token: string }
Logic:
  1. Goi fun.rich /sso-verify voi Bearer token de xac thuc + lay identity
  2. Nhan: { sub, fun_id, username, email, avatar_url, wallet_address, ... }
  3. Tim user Angel theo email (SELECT from auth.users WHERE email = ?)
  4. Neu chua co: admin.createUser({ email, email_confirm: true })
  5. Upsert fun_id_links (angel_user_id <-> fun_user_id)
  6. Tao Supabase session cho Angel user
Output: { session: { access_token, refresh_token } }
```

### Be Tri lam gi (phia Angel AI)

1. **Them nut "Dang nhap tu FUN Profile"** tren trang Auth cua Angel AI
2. **Test E2E**: Login FUN Profile -> click nut -> tu dong vao Angel AI
3. **Gui thong tin redirect URI** cho Cha Lovable FUN Profile neu can thay doi

### Be Tri lam gi (phia FUN Profile)

1. **Tuy chon**: Them nut "Mo Angel AI" tren FUN Profile UI (Phase 2, chua can lam ngay)

---

## PHẦN 3: SSO Flow Chi Tiết

```text
User tren angel.fun.rich (chua login)
  |
  | 1. Click "Dang nhap tu FUN Profile"
  | 2. SDK.startAuth() tao URL:
  |    fun.rich/functions/v1/sso-authorize
  |      ?client_id=angel_ai_client
  |      &redirect_uri=https://angel.fun.rich/auth/callback
  |      &response_type=code
  |      &scope=profile email wallet soul rewards platform_data
  |      &state=<random>
  |      &code_challenge=<S256 hash>
  |      &code_challenge_method=S256
  |
  v
fun.rich/sso-authorize
  |
  | 3. Kiem tra Authorization header
  |    - Co token? -> User da login FUN Profile -> phat code ngay
  |    - Khong co? -> Redirect ve fun.rich/auth?return_to=...&sso_flow=true
  |
  v (neu chua login)
fun.rich/auth (trang dang nhap FUN Profile)
  |
  | 4. User dang nhap (email/wallet/OTP)
  | 5. Quay lai sso-authorize voi token
  |
  v
sso-authorize phat authorization code
  |
  | 6. Redirect ve angel.fun.rich/auth/callback?code=XXX&state=YYY
  |
  v
angel.fun.rich/auth/callback
  |
  | 7. SDK.handleCallback(code, state)
  |    -> Goi fun.rich/sso-token voi code + code_verifier (PKCE)
  |    -> Nhan access_token (JWT 1h) + refresh_token (30 ngay)
  |
  | 8. Goi Angel bridge-login Edge Function
  |    -> Verify token voi fun.rich/sso-verify
  |    -> Tim/tao user Angel
  |    -> Tra Supabase session
  |
  v
User da login tren Angel AI!
```

---

## PHẦN 4: Phase 2 - Event Sync (Sau khi SSO chay on dinh)

**Cha Lovable Angel AI lam:**
- Tao bang `bridge_outbox` + `bridge_inbox`
- Tao Edge Functions: `bridge-events-dispatch`, `bridge-events-receive`
- HMAC signing cho server-to-server requests

**Cha Lovable FUN Profile lam:**
- Tao Edge Function `bridge-events-receive` (nhan events tu Angel)
- Tao trigger gui events khi profile update, light_score thay doi

**Secrets can them (Phase 2):**
- `BRIDGE_SHARED_SECRET` (HMAC key) - dat o ca 2 phia
- `ANGEL_API_URL` (base URL cua Angel Edge Functions) - dat o FUN Profile

**Events Phase 2:**
- `user.profile.updated` (FUN -> Angel: sync avatar, username)
- `light_score.updated` (FUN -> Angel: sync diem)
- `ai.conversation.summary` (Angel -> FUN: tom tat hoi thoai)

---

## PHẦN 5: Checklist Trien Khai

### Phase 1: SSO (3-5 ngay)

| # | Viec | Ai lam | Trang thai |
|---|---|---|---|
| 1 | INSERT `angel_ai_client` vao `oauth_clients` | Cha Lovable FUN Profile | ✅ Xong |
| 2 | Xac nhan `FUN_PROFILE_ORIGIN` = `https://fun.rich` | Cha Lovable FUN Profile | ✅ Xong |
| 3 | Cai SDK `@fun-ecosystem/sso-sdk` | Cha Lovable Angel AI | Chua |
| 4 | Tao `src/lib/funProfile.ts` | Cha Lovable Angel AI | Chua |
| 5 | Tao route `/auth/callback` | Cha Lovable Angel AI | Chua |
| 6 | Tao Edge Function `bridge-login` | Cha Lovable Angel AI | Chua |
| 7 | Them nut "Dang nhap tu FUN Profile" | Cha Lovable Angel AI | Chua |
| 8 | Test E2E | Be Tri | Chua |

### Test Cases

- [ ] Login FUN Profile -> vao Angel AI -> tu dong login thanh cong
- [ ] User moi (chua co tren Angel) -> tu dong tao account + link fun_id
- [ ] User cu (cung email) -> login vao account hien tai
- [ ] Token het han -> SDK tu dong refresh
- [ ] Token bi revoke -> bao loi, yeu cau login lai
- [ ] PKCE code_verifier sai -> bi chan (sso-token reject)
- [ ] redirect_uri khong dung ky -> bi chan (sso-authorize reject)

