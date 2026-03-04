

# AUDIT TOÀN DIỆN FUN PROFILE — BÁO CÁO CTO (Vòng 2)

---

## I. TỔNG QUAN TIẾN ĐỘ TỪ AUDIT TRƯỚC

Các điểm 3-12 từ audit lần 1 đã được triển khai. Audit vòng 2 này tập trung vào các vấn đề **mới phát hiện** và **chưa xử lý triệt để**.

---

## II. PHÁT HIỆN MỚI — CHẤM ĐIỂM THEO HẠNG MỤC

### 1. Auth & Session Management — 6/10 ⚠️

**Vấn đề nghiêm trọng:**

| # | Vấn đề | Mức | Files |
|---|--------|-----|-------|
| A1 | **`supabase.auth.getUser()` vẫn còn 13 files** chưa chuyển sang `useCurrentUser()` — mỗi lần = 1 network call đến Supabase Auth server | HIGH | NotificationDropdown, CommentReplyForm, EditProfile, MobileBottomNav, useReels, useSendToken, useTransactionHistory, useAdminUsers, useLivePresence, FinancialTab, LiveStream, Users, mediaUpload |
| A2 | **`supabase.auth.getSession()` gọi trực tiếp ở 53+ files** — nhiều file tạo `onAuthStateChange` subscription riêng thay vì dùng `useCurrentUser` | HIGH | FacebookNavbar, CallContext, Wallet, Friends, Donations, FacebookRightSidebar, WalletCenterContainer, FacebookCreatePost, StoriesBar, GiftNavButton... |
| A3 | **FacebookNavbar tạo auth subscription riêng** (dòng 67-78) thay vì dùng `useCurrentUser()` — duplicate listener | MED | FacebookNavbar.tsx |
| A4 | **CallContext tạo auth subscription riêng** (dòng 42-55) — thêm 1 listener nữa trên mỗi page load | MED | CallContext.tsx |

**Ước tính:** App hiện có **5-7 auth subscriptions chạy đồng thời** (useCurrentUser + LawOfLightGuard + AuthSessionKeeper + FacebookNavbar + CallContext + các component khác). Mỗi subscription = 1 WebSocket listener.

### 2. Type Safety — 5.5/10 ⚠️ (Giảm từ 6.5)

| # | Vấn đề | Scope |
|---|--------|-------|
| T1 | **469 `as any` casts** trong 47 files — tăng rủi ro runtime errors | Toàn codebase |
| T2 | **49 `useState<any>`** trong 9 files — Post.tsx, StoriesBar, FacebookCreatePost, admin components | Core components |
| T3 | **`useProfile.ts` dòng 33: `[key: string]: any`** — index signature xóa sạch type safety cho ProfileData | Profile module |
| T4 | **`liveService.ts` vẫn cast `supabase as any`** ở dòng 5 — bypass toàn bộ type checking cho live module | Live module |
| T5 | **CommentSection dòng 161: `const insertData: any`** — không typed | Feed module |
| T6 | **FacebookPostCard dùng `(post as any).metadata` 10+ lần** (dòng 314-532) thay vì extend interface | Feed module |

### 3. Hiệu năng & Memory Leaks — 7/10

| # | Vấn đề | Impact |
|---|--------|--------|
| P1 | **CommentSection tạo Realtime channel cho MỖI post** khi mở comments (dòng 62-76) — 10 posts mở = 10 WebSocket channels | HIGH — memory leak nếu user scroll nhiều |
| P2 | **NotificationDropdown gọi `getUser()` mỗi lần fetch** (dòng 51) — không cache, gọi lại mỗi khi mở dropdown | MED |
| P3 | **CommentSection N+1 query**: Fetch comments → rồi loop fetch replies 1-by-1 (dòng 117-132). 20 comments = 21 queries | HIGH — chậm rõ rệt khi post có nhiều comments |
| P4 | **`useFeedPosts` poll 30s invalidates toàn bộ feed** — tốt hơn realtime nhưng vẫn refetch tất cả pages mỗi 30s khi tab active | MED |
| P5 | **StoriesBar, GiftNavButton** mỗi cái tự query auth riêng (`useState<any>` + `getSession/getUser`) | LOW |

### 4. Bảo mật — 6.5/10 ⚠️

**Security scan vẫn phát hiện 11 findings:**

| Mức | Số lượng | Chi tiết |
|-----|----------|---------|
| ERROR | 2 | profiles public data exposed, donations financial data exposed |
| WARN | 7 | RLS always true, leaked password disabled, livestream/content/reputation/config/action_caps public |
| INFO | 2 | username data, sticker data public |

**Lưu ý:** Điểm 1-2 từ audit trước (profiles/donations public) user đã xác nhận là **by design** — công khai mọi dữ liệu là nguyên tắc của FUN Ecosystem.

**Vấn đề mới:**

| # | Vấn đề | Mức |
|---|--------|-----|
| S1 | **Leaked Password Protection vẫn tắt** — audit trước ghi nhận nhưng chưa bật | CRITICAL |
| S2 | **`pplp_action_caps` + `pplp_policies` public readable** — user có thể reverse-engineer reward formula | WARN |
| S3 | **`system_config` public readable** — lộ cooldown, freeze periods, treasury config | WARN |
| S4 | **CommentReplyForm vẫn dùng `getUser()` trực tiếp** (dòng 42, 67) thay vì `useCurrentUser` | LOW |
| S5 | **`mediaUpload.ts` gọi `getUser()` mỗi lần upload** (dòng 124) — nên dùng token từ caller | LOW |

### 5. Code Quality & Maintainability — 6.5/10

| # | Vấn đề | Impact |
|---|--------|--------|
| C1 | **FacebookPostCard = 582 dòng** — vẫn chưa refactor (audit trước chỉ refactor Profile.tsx) | HIGH |
| C2 | **NotificationDropdown = 549 dòng** — God Component với fetch, realtime, UI logic | HIGH |
| C3 | **607 `console.log` vẫn trong source** — vite.config đã strip `console.log` trong production build nhưng source vẫn cluttered, dev build chậm | MED |
| C4 | **`useProfile.ts` vẫn dùng `supabase.auth.getSession()` trực tiếp** (dòng 186) thay vì `useCurrentUser` — inconsistent với migration đã làm | MED |
| C5 | **Duplicate auth state tracking**: FacebookNavbar, CallContext, LawOfLightGuard, AuthSessionKeeper, useCurrentUser — 5 nơi track auth state riêng | HIGH |
| C6 | **`main.tsx` không có `StrictMode`** — miss double-render bugs trong dev | LOW |

### 6. Architecture — 7/10

| # | Vấn đề | Impact |
|---|--------|--------|
| AR1 | **Không có centralized error tracking** (Sentry/LogRocket) — ErrorBoundary đã thêm nhưng chỉ hiển thị UI, không gửi log | MED |
| AR2 | **Edge Functions vẫn 80+** sau cleanup — nhiều SSO functions có thể consolidate | LOW |
| AR3 | **PageLoader "Loading..." không i18n** (App.tsx dòng 98) | LOW |
| AR4 | **Feed polling 30s + highlighted posts query** = 2 parallel refetches mỗi 30s cho mọi user | MED |

---

## III. ĐIỂM TỔNG KẾT (Vòng 2)

| Hạng mục | Điểm | Thay đổi |
|----------|------|----------|
| Auth/Session | 6.0 | MỚI |
| Type Safety | 5.5 | ↓ từ 6.5 (phát hiện thêm) |
| Hiệu năng | 7.0 | ↓ từ 8.0 (phát hiện N+1, memory leak) |
| Bảo mật | 6.5 | = (leaked password chưa fix) |
| Code Quality | 6.5 | MỚI |
| Architecture | 7.0 | ↑ từ 7.5→7.0 (sau refactor nhưng còn issues) |
| **Tổng (weighted)** | **6.4/10** | |

---

## IV. ĐỀ XUẤT CẢI THIỆN — ƯU TIÊN THEO IMPACT

### CRITICAL

**1. Bật Leaked Password Protection**
- Cấu hình auth để reject mật khẩu đã bị leak trong các vụ data breach
- 1 dòng config, impact lớn

**2. Hoàn tất migration `getUser()` → `useCurrentUser()` (13 files còn lại)**
- NotificationDropdown, CommentReplyForm, EditProfile, MobileBottomNav, useReels, useSendToken, useTransactionHistory, useAdminUsers, useLivePresence, FinancialTab, LiveStream, Users, mediaUpload
- Giảm ~26+ network calls/session

### HIGH PRIORITY

**3. Fix CommentSection N+1 query**
- Thay vì fetch replies 1-by-1 cho mỗi comment, fetch tất cả comments (bao gồm replies) trong 1 query rồi group client-side theo `parent_comment_id`
- 20 comments hiện tại = 21 queries → 1 query

**4. Consolidate auth subscriptions**
- Refactor FacebookNavbar, CallContext để dùng `useCurrentUser()` thay vì tạo auth subscription riêng
- Giảm từ 5-7 auth listeners xuống còn 1-2

**5. Refactor FacebookPostCard (582 dòng)**
- Tách thành: `usePostActions` hook + `PostHeader`, `PostContent`, `PostFooter` sub-components
- Thêm `metadata` và `post_type` vào interface thay vì `(post as any).metadata`

**6. Refactor NotificationDropdown (549 dòng)**
- Tách thành: `useNotifications` hook + `NotificationList`, `NotificationFilters` sub-components
- Chuyển `getUser()` sang `useCurrentUser()`

### MEDIUM PRIORITY

**7. Siết RLS cho `pplp_action_caps` và `pplp_policies`**
- Restrict SELECT chỉ cho authenticated users hoặc service_role
- Ngăn reverse-engineer reward formula

**8. Siết RLS cho `system_config`**
- Tạo view public chỉ chứa non-sensitive fields
- Ẩn treasury balance, cooldown periods, freeze settings

**9. Fix type safety cho ProfileData**
- Xóa `[key: string]: any` index signature
- Thêm typed fields cho tất cả properties đang dùng

**10. Fix `liveService.ts` — xóa `supabase as any`**
- Import đúng types từ supabase client
- Hoặc tạo typed wrapper functions

### LOW PRIORITY

**11. Thêm `StrictMode` trong `main.tsx` (dev only)**

**12. i18n cho PageLoader text**
- "Loading..." → dùng translation key

---

## V. CHI TIẾT KỸ THUẬT

### Migration getUser → useCurrentUser (Điểm 2)
Các files cần sửa và cách sửa:
- **Components** (dùng hook trực tiếp): NotificationDropdown, CommentReplyForm, EditProfile, MobileBottomNav, FinancialTab, StoriesBar
- **Hooks** (truyền userId từ caller hoặc dùng hook): useReels, useTransactionHistory, useAdminUsers, useLivePresence
- **Utils** (nhận token/userId làm parameter): mediaUpload.ts — thay `getUser()` bằng param `userId` từ caller
- **Pages**: LiveStream, Users — dùng `useCurrentUser()` trực tiếp

### CommentSection N+1 Fix (Điểm 3)
```text
HIỆN TẠI:
  Query 1: SELECT * FROM comments WHERE post_id = X AND parent_comment_id IS NULL
  Loop: forEach comment → Query N: SELECT * FROM comments WHERE parent_comment_id = comment.id

SAU FIX:
  Query 1: SELECT * FROM comments WHERE post_id = X ORDER BY parent_comment_id NULLS FIRST
  Client: Group by parent_comment_id → build tree
```

### Auth Subscription Consolidation (Điểm 4)
```text
HIỆN TẠI (5-7 listeners):
  useCurrentUser ─── onAuthStateChange
  LawOfLightGuard ── onAuthStateChange
  AuthSessionKeeper ─ visibilitychange + refreshSession
  FacebookNavbar ──── onAuthStateChange + getSession
  CallContext ──────── onAuthStateChange + getSession

SAU FIX (2-3 listeners):
  useCurrentUser ─── onAuthStateChange (source of truth)
  LawOfLightGuard ── subscribe to useCurrentUser changes
  AuthSessionKeeper ─ visibilitychange (keep — different concern)
  FacebookNavbar ──── useCurrentUser() hook
  CallContext ──────── useCurrentUser() hook
```

