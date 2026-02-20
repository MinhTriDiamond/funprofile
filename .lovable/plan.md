
## AUDIT TOÀN BỘ CODEBASE FUN PROFILE — KẾT QUẢ & KẾ HOẠCH

---

### TOP 10 VẤN ĐỀ ẢNH HƯỞNG PERFORMANCE/STABILITY

**Vấn đề 1 — CRITICAL: NotificationDropdown memory leak (không cleanup realtime channel)**
File: `src/components/layout/NotificationDropdown.tsx` dòng 86-127

`setupRealtime()` trả về cleanup function bên trong, nhưng `useEffect` gọi `setupRealtime()` mà KHÔNG `await` và KHÔNG sử dụng cleanup trả về. Kết quả: Channel realtime không bao giờ bị remove khi component unmount → memory leak + multiple subscriptions khi component re-mount.

```ts
// HIỆN TẠI: BUG - cleanup của setupRealtime() bị bỏ qua
useEffect(() => {
  fetchNotifications();
  const setupRealtime = async () => {
    const channel = supabase.channel(...)...subscribe();
    return () => { supabase.removeChannel(channel); }; // ← BỊ BỎ QUA
  };
  setupRealtime(); // ← Không await, không nhận cleanup
}, [fetchNotifications]);

// fetchNotifications trong dependency array gây re-create mỗi render (xem vấn đề 2)
```

---

**Vấn đề 2 — HIGH: `fetchNotifications` trong NotificationDropdown phụ thuộc `unreadCount` state → infinite re-subscribe**
File: `src/components/layout/NotificationDropdown.tsx` dòng 44-84

`fetchNotifications` được wrap bằng `useCallback` với `[unreadCount]` trong deps. Mỗi khi unreadCount thay đổi → fetchNotifications thay đổi → useEffect chạy lại → subscribe channel mới. Cycle này tạo nhiều subscription đồng thời.

---

**Vấn đề 3 — HIGH: `LightScoreDashboard` mount 4 hooks nặng đồng thời, không memo**
File: `src/components/wallet/LightScoreDashboard.tsx` dòng 111-119

Mỗi lần render `LightScoreDashboard`, 4 hooks được mount: `useLightScore` (invoke edge function), `usePendingActions` (Supabase query + realtime), `useFunBalance` (2x on-chain read via wagmi), `useMintHistory` (Supabase query + realtime). Không có `React.memo` → parent re-render gây toàn bộ 4 hooks re-evaluate. Trên mobile BSC Testnet, latency cao, mỗi re-render = nhiều network call.

---

**Vấn đề 4 — HIGH: `useTokenBalances` khởi tạo 5 contract reads & 1 price API call mà không cần address**
File: `src/hooks/useTokenBalances.ts` dòng 174-180

`fetchPrices` luôn chạy ngay cả khi không có ví kết nối, đồng thời `useCamlyPrice` (`src/hooks/useCamlyPrice.ts`) cũng fetch cùng endpoint `token-prices`. `WalletCenterContainer` import cả hai hooks → double fetch tới cùng 1 edge function trong cùng 1 page render. Mặc dù có localStorage cache, nhưng trong khoảng TTL đầu (< 60s) cả 2 hooks đều fire.

---

**Vấn đề 5 — HIGH: `FacebookNavbar` fetch profile + admin check on EVERY auth state change, không cache**
File: `src/components/layout/FacebookNavbar.tsx` dòng 60-113

`useEffect` subscribe `onAuthStateChange`. Mỗi khi event trigger → 2 sequential Supabase queries (profile fetch + has_role RPC). Vì Navbar mount liên tục và auth events có thể fire nhiều lần (INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED), điều này gây nhiều unnecessary DB calls.

---

**Vấn đề 6 — MEDIUM: `usePendingActions` và `useMintHistory` đều gọi `fetchHistory` trong `useEffect` với `fetchHistory` trong deps — risk of re-subscribe loop**
File: `src/hooks/usePendingActions.ts` dòng 75-156 và `src/hooks/useMintHistory.ts` dòng 54-124

Cả 2 hooks có pattern `useEffect(..., [fetchXxx])`. Nếu `fetchXxx` được recreate (do dependency thay đổi), `useEffect` chạy lại → channel được cleanup + recreate. Hiện tại `useCallback([])` đủ ổn định, nhưng khi `fetchPendingActions` được gọi trong `claim()` (dòng 202), nó trigger re-render → có thể ảnh hưởng subscription lifecycle.

---

**Vấn đề 7 — MEDIUM: `UnifiedGiftSendDialog` (1281 dòng) quá lớn, import nặng top-level**
File: `src/components/donations/UnifiedGiftSendDialog.tsx`

File này 1281 dòng, import `EmojiPicker` và nhiều components nặng ở top-level. Bất kỳ trang nào dùng dialog này (Feed, Profile, Chat, Navbar) đều load toàn bộ bundle này ngay cả khi dialog chưa mở. `EmojiPicker` nên được dynamic import.

---

**Vấn đề 8 — MEDIUM: `useConversations` subscribe channel 'conversations-changes' không có filter theo userId**
File: `src/hooks/useConversations.ts` dòng 104-136

Channel `conversations-changes` subscribe ALL changes trên bảng `conversations` và `conversation_participants` mà không có filter. Nếu hệ thống có nhiều conversations (1000+), mỗi INSERT/UPDATE đều push tới tất cả connected clients → gây `invalidateQueries` không cần thiết, re-fetch tất cả conversations của user dù conversation đó không liên quan.

---

**Vấn đề 9 — MEDIUM: `useLightScore` không sử dụng React Query — không có cache, retry, hoặc deduplication**
File: `src/hooks/useLightScore.ts`

Hook dùng manual `useState` + `useEffect` thay vì `useQuery`. Nếu 2 components mount `useLightScore` đồng thời → 2 requests tới `pplp-get-score` edge function (cold start risk). Không có stale-while-revalidate, không có error retry tự động.

---

**Vấn đề 10 — MEDIUM: `useTokenBalances` và `useFunBalance` dùng `refetchInterval: 30000` kể cả khi app ở background**
File: `src/hooks/useTokenBalances.ts` (dòng 174-180), `src/hooks/useFunBalance.ts` (dòng 36-39, 54-58)

`useFunBalance` set `refetchInterval: 30000` trực tiếp trong wagmi `useReadContract`. `useTokenBalances` poll price mỗi 5 phút. Nếu user để tab background, các interval này vẫn chạy, tốn battery/bandwidth trên mobile, và có thể trigger wagmi store reset crash (vấn đề đã gặp: `hasValue` error).

---

### KẾ HOẠCH FIX THEO 3 MỨC

---

#### QUICK WINS (1–2 giờ) — Có thể sửa ngay, không cần refactor lớn

**QW-1: Fix memory leak NotificationDropdown**
- Chuyển subscription channel sang `useRef`, đảm bảo cleanup trong return của `useEffect`
- Tách `unreadCount` ra khỏi `fetchNotifications` deps (dùng functional updater thay vì đọc state)
- File: `src/components/layout/NotificationDropdown.tsx`

**QW-2: Stop `useFunBalance` polling khi app ở background**
- Thêm `refetchIntervalInBackground: false` vào `useReadContract` options
- File: `src/hooks/useFunBalance.ts`

**QW-3: Deduplicate price fetch — useCamlyPrice + useTokenBalances**
- `useCamlyPrice` hiện tại đọc từ `localStorage` cache trước → đã ổn phần logic
- Vấn đề: cả 2 hooks vẫn invoke edge function trong window 60s đầu nếu cache empty
- Fix: Thêm global semaphore `window.__pricesFetching` để chỉ 1 call đồng thời

**QW-4: Pause realtime intervals khi tab ẩn**
- Trong `useMintHistory` và `usePendingActions`, khi `visibilitychange` → hidden, skip realtime callback; khi visible lại → refetch 1 lần
- File: `src/hooks/useMintHistory.ts`, `src/hooks/usePendingActions.ts`

**QW-5: Fix NotificationDropdown channel không cleanup**
- Dùng `useRef<ReturnType<typeof supabase.channel>>` để track channel, cleanup đúng cách

---

#### MEDIUM (0.5–1 ngày) — Cải thiện đáng kể performance & stability

**MED-1: Migrate `useLightScore` sang React Query**
- Dùng `useQuery({ queryKey: ['light-score'], queryFn: ..., staleTime: 60_000 })`
- Tự động deduplication: 2 components dùng cùng query key → chỉ 1 network call
- Tự động retry, stale-while-revalidate, background refetch
- File: `src/hooks/useLightScore.ts`

**MED-2: Thêm `visibilitychange` pause cho `useTokenBalances`**
- Dừng `fetchPrices` interval khi tab ẩn, resume khi tab active
- Đồng thời thêm `enabled: !!address` cho các `useReadContract` contract reads nếu chưa có địa chỉ
- File: `src/hooks/useTokenBalances.ts`

**MED-3: Fix `useConversations` channel filter**
- Thay vì subscribe toàn bộ `conversations` table, dùng filter theo `created_by=eq.${userId}` hoặc kết hợp với `conversation_participants`
- Hoặc chuyển sang `useEffect` đơn giản hơn: sau mỗi conversation update, chỉ invalidate nếu user là participant
- File: `src/hooks/useConversations.ts`

**MED-4: Dynamic import EmojiPicker trong UnifiedGiftSendDialog**
- `const EmojiPicker = lazy(() => import('@/components/feed/EmojiPicker'))`
- Bọc `<Suspense>` với fallback loading nhỏ
- File: `src/components/donations/UnifiedGiftSendDialog.tsx`

**MED-5: Cache profile và admin check trong Navbar bằng React Query**
- `useQuery({ queryKey: ['navbar-profile', userId], queryFn: ..., staleTime: 5 * 60_000 })`
- Không re-fetch mỗi auth state change nếu data còn fresh
- File: `src/components/layout/FacebookNavbar.tsx`

**MED-6: Wrap `LightScoreDashboard` với `React.memo`**
- Ngăn re-render khi parent (`FunMoneyTab`) không thay đổi props thực sự
- Xem xét dùng `useCallback` cho `onActivate`, `onClaim` trong `FunMoneyTab`
- File: `src/components/wallet/LightScoreDashboard.tsx`, `src/components/wallet/tabs/FunMoneyTab.tsx`

---

#### STRUCTURAL REFACTOR (2–5 ngày) — Nâng tầng kiến trúc

**SR-1: Tạo `useCurrentUser` hook singleton**

Hiện tại, 67+ file gọi `supabase.auth.getSession()` hoặc `supabase.auth.getUser()` riêng lẻ trong `useEffect`. Cần một hook trung tâm:

```ts
// src/hooks/useCurrentUser.ts
export const useCurrentUser = () => useQuery({
  queryKey: ['current-user'],
  queryFn: () => supabase.auth.getSession().then(r => r.data.session?.user ?? null),
  staleTime: Infinity, // Auth state managed by Supabase SDK
});
```

Kết hợp với `supabase.auth.onAuthStateChange` để invalidate khi auth thay đổi. Tất cả components dùng chung 1 cache entry.

**SR-2: Tách `UnifiedGiftSendDialog.tsx` (1281 dòng) thành modules**

Đề xuất cấu trúc:
```
src/components/donations/gift-dialog/
  index.tsx              ← Entry point (lazy loadable)
  StepForm.tsx           ← Bước 1: nhập thông tin
  StepConfirm.tsx        ← Bước 2: xác nhận
  RecipientSearch.tsx    ← Tìm kiếm recipient
  MultiSendProgress.tsx  ← Tiến trình gửi nhiều người
  useDonationFlow.ts     ← Logic hook tập trung
```

**SR-3: Tạo notification service tập trung**

```ts
// src/services/notificationService.ts
// Singleton channel: tất cả hooks/components subscribe qua 1 channel
// Expose: subscribe(eventType, callback), unsubscribe, markRead, markAllRead
```

Tránh nhiều components tạo channel `notifications-${userId}` riêng lẻ.

**SR-4: Chuẩn hóa realtime pattern với `useRealtimeTable` utility**

```ts
// src/hooks/useRealtimeTable.ts
export function useRealtimeTable<T>({ table, filter, onInsert, onUpdate, enabled }) {
  // Central channel management, cleanup, isMounted guard
}
```

Dùng lại ở `useMintHistory`, `usePendingActions`, `useConversations`, `NotificationDropdown`.

**SR-5: Web3 context stability — disable polling khi không active**

Thêm `PageVisibilityProvider` theo dõi `document.visibilityState`, inject vào wagmi config:
```ts
// Wagmi queryClient config
refetchIntervalInBackground: false, // global
```

Và tắt `useTokenBalances` price polling khi user không ở wallet tab.

---

### CHECKLIST TEST SAU KHI FIX

- [ ] Mở DevTools → Network → Xác nhận `token-prices` chỉ được gọi 1 lần khi load `/wallet`
- [ ] Mở Console → Không có lỗi `Cannot read properties of undefined (reading 'hasValue')` sau HMR
- [ ] Mở Performance tab → Record 30s → Feed scroll không có excessive re-renders (mỗi PostCard không re-render khi post khác thay đổi)
- [ ] Notification: Thêm notification mới từ admin → Dropdown tự update trong ≤2s mà không bị memory leak
- [ ] Wallet → Fun Money: Giữ tab mở 5 phút → DevTools Memory → Không có heap growth liên tục
- [ ] Background tab 2 phút → Quay lại → Balance refresh 1 lần, không có cascade requests
- [ ] Mobile Safari: Mở/đóng `UnifiedGiftSendDialog` 3 lần → Không có overlay đen kẹt
- [ ] Gửi token → Tab bị đóng trước khi DB log → Reload app → `usePendingDonationRecovery` tự recover
- [ ] Admin ký mint request → User tab tự cập nhật status ≤3s qua realtime WebSocket
- [ ] `useMintHistory` + `usePendingActions` unmount (navigate sang tab khác) → DevTools Application → Supabase channels = 0 sau cleanup

---

### THỨ TỰ ƯU TIÊN THỰC HIỆN

```text
Tuần 1:
  [Ngày 1] QW-1 (NotifDropdown leak) + QW-2 (FunBalance no bg poll) + QW-4 (visibility pause)
  [Ngày 2] QW-5 (NotifDropdown channel fix) + MED-5 (Navbar profile cache)
  [Ngày 3] MED-1 (useLightScore → React Query) + MED-4 (lazy EmojiPicker)

Tuần 2:
  [Ngày 4] MED-2 (tokenBalances pause) + MED-3 (conversations filter)
  [Ngày 5] MED-6 (LightScoreDashboard memo) + QW-3 (price semaphore)
  [Ngày 6-7] SR-1 (useCurrentUser hook)

Tuần 3-4 (nếu cần):
  SR-2 (tách UnifiedGiftSendDialog)
  SR-3 (notification service)
  SR-4 (useRealtimeTable utility)
  SR-5 (Web3 visibility)
```
