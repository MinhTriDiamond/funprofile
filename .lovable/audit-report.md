# FUN Profile — Full Codebase Audit & Standardization Report

**Ngày:** 2026-03-09  
**Phạm vi:** Toàn bộ frontend + edge functions + database schema

---

## PHẦN 1 — FULL CODEBASE AUDIT

### 1.1 Frontend Architecture

#### Cấu trúc thư mục hiện tại
```
src/
├── assets/          ← OK
├── components/      ← 17 subdirs, ~120+ files — BIG
├── config/          ← 5 files — OK
├── contexts/        ← 2 files — lightweight
├── data/            ← ?
├── hooks/           ← 50+ hooks — SCATTERED
├── i18n/            ← OK
├── integrations/    ← auto-generated, OK
├── lib/             ← 16 files — MIXED concerns
├── modules/         ← chat + live — GOOD pattern
├── pages/           ← 35 pages — OK
├── services/        ← 1 file only — UNDERUSED
├── types/           ← 5 files — INCOMPLETE
├── utils/           ← 15 files — MIXED with lib/
```

**Vấn đề phát hiện:**

| # | Vấn đề | Mức độ | Ảnh hưởng |
|---|--------|--------|-----------|
| F1 | `hooks/` chứa 50+ hooks ngang hàng, không nhóm theo domain | Medium | maintainability |
| F2 | `lib/` và `utils/` chồng chéo vai trò (cả hai chứa helpers) | Low | maintainability |
| F3 | `services/` chỉ có 1 file — pattern không nhất quán | Low | architecture |
| F4 | `modules/` chỉ có chat + live — các domain khác (wallet, rewards, auth) chưa module hóa | High | maintainability, velocity |
| F5 | `components/feed/` chứa 44 files — quá lớn, lẫn UI + business logic | High | maintainability |
| F6 | `components/wallet/` chứa 21 files — lẫn reward/light-score/claim logic | Medium | maintainability |
| F7 | `components/admin/` chứa 27 tab components — mỗi tab là một mini-app | Medium | maintainability |

#### Module Boundaries
- ✅ **chat** và **live** đã được module hóa tốt (`src/modules/chat/`, `src/modules/live/`)
- ❌ **wallet/rewards/auth/feed** vẫn phân tán giữa `components/`, `hooks/`, `pages/`

#### Duplicated Logic
| Logic | Nơi lặp | Mức độ |
|-------|---------|--------|
| Admin check (`has_role` RPC) | `FacebookNavbar.tsx`, `FacebookLeftSidebar.tsx`, nhiều admin components | Medium |
| Profile fetch | `FacebookNavbar`, `FacebookLeftSidebar`, `Profile.tsx`, nhiều hooks | Medium |
| Auth state access | Đã cải thiện với `useCurrentUser` — nhưng vẫn còn vài nơi dùng trực tiếp | Low |
| Navigation items | Đã gom vào `config/navigation.ts` — ✅ Fixed |
| Language options | Đã gom vào `config/navigation.ts` — ✅ Fixed |

#### State Management
- ✅ React Query cho server state — tốt
- ✅ `useCurrentUser` singleton — tốt  
- ⚠️ `FacebookLeftSidebar` vẫn dùng `useState + useEffect` fetch profile thay vì React Query
- ⚠️ `contexts/` chỉ có 2 context (ActiveAccount, Call) — không lạm dụng

### 1.2 Backend / Edge Functions

**Tổng: 87 edge functions** — khá nhiều

#### Nhóm theo domain:

| Domain | Functions | Ghi chú |
|--------|-----------|---------|
| SSO/Auth | sso-authorize, sso-token, sso-refresh, sso-revoke, sso-register, sso-verify, sso-set-password, sso-otp-request, sso-otp-verify, sso-merge-*, sso-web3-auth, sso-sync-*, sso-resend-webhook, auth-email-hook, check-email-exists, verify-email-link, send-email-link-verification, log-login-ip | 18 functions — NHIỀU |
| PPLP/Rewards | pplp-evaluate, pplp-score-action, pplp-submit-action, pplp-authorize-mint, pplp-batch-processor, pplp-compute-dimensions, pplp-detect-fraud, pplp-epoch-snapshot, pplp-get-score, pplp-mint-fun, claim-reward, approve-claim, backfill-reward-claims | 13 functions |
| Wallet/Crypto | connect-external-wallet, disconnect-external-wallet, check-transaction, detect-incoming-transfers, mint-soul-nft, token-prices, treasury-balance, scan-treasury-outgoing | 8 functions |
| Donations | record-donation, manual-create-donation, backfill-donations, backfill-tx-donations, auto-backfill-donations, recalculate-fun-amounts, notify-gift-ready | 7 functions |
| Admin | admin-batch-mint-requests, admin-delete-user, admin-list-merge-requests, admin-merge-mint-requests, admin-update-media-url, batch-ban-users, batch-delete-banned-users, daily-fraud-scan, scheduled-reconciliation | 9 functions |
| Media/Storage | upload-to-r2, upload-to-cf-images, delete-from-r2, get-upload-url, generate-presigned-url, r2-signed-chunk-url, multipart-upload, migrate-to-r2, migrate-stream-to-r2, cleanup-orphan-videos, cleanup-supabase-storage, optimize-storage, image-transform, media-guard, stream-video | 15 functions — NHIỀU |
| Live | live-token, live-recording-status, recording-finalize, auto-finalize-recordings, recover-orphan-livestreams, notify-live-started | 6 functions |
| Content | create-post, fetch-link-preview, analyze-reel, get-reel-recommendations, seo-render, sitemap | 6 functions |
| Finance | list-all-transactions | 1 function |
| Other | delete-user-account | 1 function |

**Vấn đề phát hiện:**

| # | Vấn đề | Mức độ | Ảnh hưởng |
|---|--------|--------|-----------|
| B1 | Media/Storage có 15 functions — nhiều có chức năng tương tự (upload-to-r2 vs multipart-upload vs get-upload-url vs generate-presigned-url) | High | maintainability |
| B2 | Donation backfill có 3 variants (backfill-donations, backfill-tx-donations, auto-backfill-donations) — có thể gộp | Medium | maintainability |
| B3 | SSO có 18 functions — một số có thể là router pattern (đã có router?) | Medium | maintainability |
| B4 | `_shared/` chỉ chứa pplp helpers — thiếu shared utilities cho auth, response, validation | High | consistency |

### 1.3 Database Schema

**Bảng phát hiện qua types.ts (partial):**
- profiles, user_roles, friendships, posts, comments, conversations, messages, donations, light_actions, light_reputation, live_sessions, custodial_wallets, v.v.

**Vấn đề:**

| # | Vấn đề | Mức độ |
|---|--------|--------|
| D1 | `pplp_device_registry` referenced in code nhưng không có trong generated types — phantom table? | Medium |
| D2 | `search_history` referenced via `(supabase as any).from('search_history')` — missing from types | Medium |
| D3 | `red_envelopes` / `red_envelope_claims` referenced via `as any` cast — missing from types | Low |

### 1.4 Cross-Cutting Concerns

| Concern | Hiện trạng | Đánh giá |
|---------|-----------|----------|
| Permission logic | `has_role` RPC + `useRewardGating` hook | ⚠️ Scattered |
| Reward gating | `useRewardGating` centralized | ✅ Good |
| Wallet-first gating | Integrated in reward gating | ✅ Good |
| Account linking | `useLoginMethods` + SecuritySettings | ✅ Good |
| Logging | `src/lib/logger.ts` exists | ⚠️ Underused (77 console.log still) |
| Error handling | Mixed: throw Error, console.error, toast | ⚠️ Inconsistent |
| i18n | LanguageContext + translations | ✅ Good but incomplete coverage |
| Feature flags | None | ⚠️ Missing |

---

## PHẦN 2 — VẤN ĐỀ LỚN CẦN CHUẨN HÓA

### 🔴 HIGH Priority

1. **Hooks không nhóm theo domain** — 50+ hooks ngang hàng trong `src/hooks/`
   - Ảnh hưởng: maintainability, onboarding
   - Giải pháp: Nhóm hooks vào domain modules

2. **components/feed/ quá lớn** — 44 files lẫn UI components và business logic
   - Ảnh hưởng: maintainability, velocity
   - Giải pháp: Tách theo sub-domains (post, comment, reaction, media)

3. **Edge function _shared/ thiếu common patterns** — mỗi function tự handle auth, CORS, response format
   - Ảnh hưởng: consistency, security
   - Giải pháp: Tạo shared helpers cho auth, response, validation

4. **`as any` usage: 156 instances** trong 17 files
   - Ảnh hưởng: type safety, bug risk
   - Giải pháp: Dần thay bằng proper typing, đặc biệt `useDimensionScores` (7 casts), `usePplpAdmin` (3 casts)

5. **Media edge functions chồng chéo** — 15 functions cho upload/storage
   - Ảnh hưởng: maintainability, consistency
   - Giải pháp: Gộp thành media-service với sub-routes

### 🟡 MEDIUM Priority

6. **`console.log` còn 77 instances** — nên dùng `logger` thay thế
   - Ảnh hưởng: production cleanliness
   
7. **Error handling không nhất quán** — 510 catch blocks, mix giữa toast/console/throw
   - Ảnh hưởng: UX, debugging
   
8. **FacebookLeftSidebar dùng useState+useEffect thay vì React Query** cho profile fetch
   - Ảnh hưởng: consistency, caching

9. **Admin tabs là mini-apps** — 27 tab components, mỗi cái tự fetch/manage state
   - Ảnh hưởng: maintainability

10. **Donation backfill functions trùng lặp** — 3 variants
    - Ảnh hưởng: maintainability

### 🟢 LOW Priority

11. **`lib/` và `utils/` chồng chéo** — không rõ boundary
12. **`services/` chỉ có 1 file** — pattern chưa nhất quán
13. **`data/` folder** — chưa rõ mục đích
14. **Một số phantom tables** không trong generated types

---

## PHẦN 3 — TARGET ARCHITECTURE

### Đề xuất cấu trúc module-based:

```
src/
├── config/                    ← Global config (navigation, web3, pplp, sso)
├── i18n/                      ← Internationalization
├── integrations/              ← Auto-generated (Supabase client/types)
│
├── shared/                    ← Cross-domain shared code
│   ├── components/            ← Generic UI (Button, Modal, ErrorBoundary)
│   ├── hooks/                 ← Generic hooks (useDebounce, useMobile, useCurrentUser)
│   ├── lib/                   ← Pure utilities (formatters, logger, utils)
│   ├── types/                 ← Shared TypeScript types
│   └── policies/              ← Business rule layer (capabilities, permissions)
│       ├── useCapabilities.ts
│       ├── useRewardGating.ts
│       └── useLoginMethods.ts
│
├── modules/                   ← Domain modules (self-contained)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── feed/
│   │   ├── components/
│   │   │   ├── post/
│   │   │   ├── comment/
│   │   │   └── reaction/
│   │   ├── hooks/
│   │   └── pages/
│   ├── wallet/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── rewards/               ← PPLP, Light Score, Claims
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── chat/                  ← Already modularized ✅
│   ├── live/                  ← Already modularized ✅
│   ├── friends/
│   ├── notifications/
│   ├── donations/
│   ├── profile/
│   ├── settings/
│   │   ├── components/
│   │   └── pages/
│   ├── admin/
│   │   ├── tabs/
│   │   ├── hooks/
│   │   └── pages/
│   └── reels/
│
├── pages/                     ← Route entry points (thin wrappers)
├── components/ui/             ← shadcn/radix primitives
└── assets/
```

### Lợi ích:
- Mỗi domain có boundary rõ ràng
- Business logic nằm trong module hooks
- UI components tách khỏi domain logic
- Dễ tìm code: muốn sửa reward → vào `modules/rewards/`
- Dễ onboard dev mới

---

## PHẦN 4 — NAMING CONVENTIONS

### Đề xuất chuẩn:

| Category | Convention | Ví dụ |
|----------|-----------|-------|
| Components | PascalCase, descriptive | `PostCard`, `ReactionButton` |
| Hooks | `use` + Domain + Action | `usePostStats`, `useClaimReward` |
| Services | domain + `Service` | `walletService`, `rewardService` |
| Utils | camelCase, verb-led | `formatDate`, `validateEmail` |
| Edge functions | kebab-case, domain-action | `pplp-evaluate`, `wallet-connect` |
| DB tables | snake_case, plural | `light_actions`, `mint_epochs` |
| Booleans | `is_`, `has_`, `can_` prefix | `is_active`, `has_password`, `can_claim` |
| Timestamps | `*_at` suffix | `created_at`, `verified_at`, `minted_at` |
| Status fields | Enum type | `status: 'pending' \| 'approved' \| 'rejected'` |

### Chỗ naming chưa ổn:
- `reward_locked` → nên `is_reward_locked`
- `auto_provisioned` → OK nhưng nên `is_auto_provisioned`
- `webhook_sent` → nên `is_webhook_sent`
- Edge function `recalculate-fun-amounts` → quá dài, nên `rewards-recalculate`
- `FacebookLeftSidebar`, `FacebookCreatePost` — prefix "Facebook" không cần thiết

---

## PHẦN 5 — CAPABILITY / POLICY LAYER

### Hiện trạng:
- ✅ `useRewardGating()` — tập trung, tốt
- ✅ `useLoginMethods()` — tập trung, tốt
- ⚠️ `useAccountCapabilities.ts` — có nhưng cần audit scope
- ❌ Admin check bị rải rác (mỗi component tự gọi `has_role`)

### Đề xuất: `shared/policies/`

```typescript
// useCapabilities.ts — Single source of truth cho business rules
export function useCapabilities() {
  const { user } = useCurrentUser();
  const { isRewardLocked } = useRewardGating();
  const { methods } = useLoginMethods();
  
  return {
    canClaim: !isRewardLocked && methods.hasEmail,
    canMint: !isRewardLocked,
    canPost: user !== null,
    canGoLive: user !== null,
    isAdmin: /* cached admin check */,
    isLimited: user?.account_status === 'limited',
    securityLevel: methods.count,
  };
}
```

### Admin check chuẩn hóa:
```typescript
// useAdminRole.ts — Shared, cached
export function useAdminRole() {
  const { userId } = useCurrentUser();
  return useQuery({
    queryKey: ['admin-role', userId],
    queryFn: () => supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    staleTime: 10 * 60_000,
    enabled: !!userId,
  });
}
```

---

## PHẦN 6 — NAVIGATION / ROUTING

### ✅ Đã chuẩn hóa:
- `src/config/navigation.ts` — Single source of truth
- `LanguageSwitcher` dùng chung `languageOptions`
- `FacebookNavbar` + `FacebookLeftSidebar` đọc từ config

### Cần thêm:
- `MobileBottomNav` chưa đọc đầy đủ từ config (chỉ import, chưa dùng)
- Route definitions nên tập trung vào `config/routes.ts`

---

## PHẦN 7 — ERROR HANDLING

### Hiện trạng:
- 510 catch blocks — nhiều dùng `console.error` + `toast.error`
- Không có error shape thống nhất
- Edge functions trả về format khác nhau

### Đề xuất chuẩn:

```typescript
// shared/lib/errors.ts
interface AppError {
  code: string;        // 'REWARD_LOCKED', 'AUTH_REQUIRED', 'RATE_LIMITED'
  message: string;     // User-facing message
  details?: unknown;   // Internal debug info
}

// Edge function response shape
interface EdgeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
```

### Logging rules:
1. `logger.error()` — cho production errors cần debug
2. `logger.debug()` — cho development flow tracing
3. `toast.error()` — cho user-facing messages
4. **KHÔNG** `console.log` trong production code

---

## PHẦN 8 — LOGGING / AUDIT

### Hiện trạng:
- `audit_logs` table — cho admin actions ✅
- `account_activity_logs` table — cho user actions ✅
- `login_ip_logs` — cho security ✅
- `logger.ts` — dev-only logger ✅
- 77 `console.log` còn sót — cần cleanup

### Đề xuất phân tầng:
1. **Product Activity Log** → `account_activity_logs` (user-facing actions)
2. **Security/Audit Log** → `audit_logs` (admin actions, sensitive operations)
3. **Debug Log** → `logger.debug()` (dev only, stripped in prod)

---

## PHẦN 9 — TYPES / SCHEMA / VALIDATION

### `as any` audit: 156 instances
Top offenders:
- `useDimensionScores.ts` — 7 casts → cần proper typing từ `useLightScore` return type
- `usePplpAdmin.ts` — 3 casts → `multisig_signatures`, `nonces` typing
- `liveService.ts` — 3 casts → custom RPCs missing from types
- `useSlugResolver.ts` — 2 casts → dynamic table queries
- `searchHistory.ts` — 1 cast → phantom table

### Đề xuất:
1. Tạo `types/pplp.ts` cho PPLP domain types
2. Tạo `types/wallet.ts` cho wallet/crypto types
3. Sử dụng Zod schemas cho edge function request/response validation
4. Database RPCs cần được thêm vào generated types (hoặc tạo manual types)

---

## PHẦN 10 — EDGE FUNCTIONS CLEANUP

### Functions nên gộp:

| Nhóm hiện tại | Đề xuất | Lý do |
|---------------|---------|-------|
| upload-to-r2 + multipart-upload + get-upload-url + generate-presigned-url + r2-signed-chunk-url | `media-upload` (router) | 5 functions cùng domain |
| backfill-donations + backfill-tx-donations + auto-backfill-donations | `donations-backfill` (router) | 3 variants cùng logic |
| migrate-to-r2 + migrate-stream-to-r2 | `media-migrate` | 2 migration functions |
| cleanup-orphan-videos + cleanup-supabase-storage + optimize-storage | `storage-cleanup` | 3 cleanup functions |

### Naming inconsistencies:
- `batch-ban-users` vs `admin-delete-user` → thiếu `admin-` prefix
- `delete-from-r2` → nên `media-delete`
- `list-all-transactions` → nên `finance-list-transactions`

### Shared utilities cần thêm vào `_shared/`:
```
_shared/
├── auth.ts          ← verify JWT, get user
├── cors.ts          ← CORS headers
├── response.ts      ← standard response format
├── validation.ts    ← request validation helpers
├── supabase.ts      ← create admin client
├── pplp-*.ts        ← existing PPLP helpers ✅
```

---

## PHẦN 11 — TESTING STRATEGY

### Hiện trạng: Không có test files

### Đề xuất thứ tự ưu tiên:

**Tier 1 — Critical Auth/Security (test đầu tiên):**
1. Auth flows (signup, login, logout)
2. Wallet-first signup + account linking
3. Password reset flow
4. `useRewardGating` logic
5. `useLoginMethods` logic

**Tier 2 — Money flows:**
6. Claim reward flow
7. Gift/donation flow
8. Token send flow

**Tier 3 — Core features:**
9. Post creation
10. Livestream auth + join flow
11. Chat send/receive

### Approach:
- Integration tests cho critical hooks (Vitest + React Testing Library)
- E2E tests cho auth + wallet flows (nếu có budget)
- Edge function unit tests (Deno test)

---

## PHẦN 12 — REFACTOR ROADMAP

### PHASE 1 — Quick Wins (1-2 tuần, ít rủi ro)

| Task | Risk | Impact |
|------|------|--------|
| Replace 77 `console.log` → `logger` | None | Cleanliness |
| Gom `_shared/` edge function helpers (cors, auth, response) | Low | Consistency |
| Move `FacebookLeftSidebar` profile fetch → React Query | Low | Consistency |
| Create `useAdminRole()` shared hook | Low | DRY |
| Clean up `lib/` vs `utils/` boundary | Low | Clarity |
| Remove "Facebook" prefix from component names | Low | Naming |

**KHÔNG làm ngay:** Đổi cấu trúc thư mục lớn, refactor edge functions

### PHASE 2 — Architecture Cleanup (2-4 tuần)

| Task | Risk | Impact | Dependencies |
|------|------|--------|-------------|
| Module hóa `hooks/` → nhóm theo domain | Medium | High | Phase 1 |
| Tách `components/feed/` → sub-domains | Medium | High | Phase 1 |
| Tạo `shared/policies/useCapabilities` | Medium | High | useAdminRole |
| Chuẩn hóa error handling pattern | Medium | Medium | - |
| Fix top `as any` offenders (20 casts) | Medium | Medium | - |
| Tạo `config/routes.ts` | Low | Medium | - |

**KHÔNG làm ngay:** Gộp edge functions, đổi DB schema

### PHASE 3 — Deep Refactors (4-8 tuần, cần test kỹ)

| Task | Risk | Impact | Dependencies |
|------|------|--------|-------------|
| Gộp media edge functions thành router | High | High | Phase 2, tests |
| Gộp donation backfill functions | High | Medium | Phase 2 |
| Module hóa wallet/rewards/auth | High | High | Phase 2, tests |
| Add integration tests cho critical flows | Medium | Very High | Phase 2 |
| Edge function naming standardization | Medium | Medium | Phase 2 |
| Add feature flag system | Medium | Medium | Phase 2 |

### ⚠️ CẨN THẬN ĐẶC BIỆT:
1. **Auth flows** — KHÔNG refactor auth logic mà không test kỹ (SSO, wallet-first, email linking)
2. **Wallet security** — KHÔNG chạm custodial wallet logic (encrypted keys)
3. **Reward/PPLP** — KHÔNG thay đổi scoring formula hay mint logic
4. **Livestream** — KHÔNG đổi Agora integration patterns
5. **Edge functions đang chạy production** — gộp phải test regression

---

## PHẦN 13 — FILE / MODULE ƯU TIÊN XỬ LÝ

### Ưu tiên cao nhất:
1. `src/hooks/useDimensionScores.ts` — 7 `as any` casts
2. `src/components/feed/` — 44 files cần tổ chức lại
3. `supabase/functions/_shared/` — thêm common helpers
4. `src/hooks/` — nhóm theo domain
5. `src/lib/` vs `src/utils/` — hợp nhất

### Files an toàn để refactor ngay:
- Rename `FacebookLeftSidebar` → `LeftSidebar`
- Rename `FacebookCreatePost` → `CreatePost`
- Rename `FacebookPostCard` → `PostCard`
- Rename `FacebookNavbar` → `AppNavbar`
- Rename `FacebookRightSidebar` → `RightSidebar`
- Move `ValentineMusicButton.tsx` ra khỏi layout/

---

## PHẦN 14 — TRIỂN KHAI

### Nguyên tắc:
1. **Incremental** — mỗi PR nhỏ, an toàn
2. **No big bang** — không refactor toàn bộ 1 lần
3. **Test trước khi ship** — đặc biệt auth, wallet, rewards
4. **Backward compatible** — giữ routes, APIs, DB schema ổn định
5. **Measure** — audit lại sau mỗi phase

### Kết luận:
FUN Profile đã có nền tảng tốt (React Query, useCurrentUser, module pattern cho chat/live, navigation config). Cần tiếp tục mở rộng pattern tốt này cho các domain còn lại, đồng thời dọn dẹp technical debt (console.log, as any, component naming, edge function consolidation).
