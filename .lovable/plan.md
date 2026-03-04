

# AUDIT TOÀN DIỆN FUN PROFILE — BÁO CÁO CTO (Vòng 4)

---

## I. TIẾN ĐỘ TỪ AUDIT VÒNG 3

| Điểm | Trạng thái |
|------|-----------|
| 1. Leaked Password Protection | ⏳ Hướng dẫn đã cung cấp — con cần vào Settings → Cloud → Users → Auth settings → Email settings → bật "Password HIBP Check" |
| 2. Siết RLS live_sessions | ✅ Tạo view `public_live_sessions` |
| 3. Loại bỏ auth subscriptions thừa | ✅ Giảm từ 10 → 5 listeners (tất cả cần thiết) |
| 4. Refactor FacebookCreatePost | ❌ Vẫn 1.064 dòng — chưa thực hiện |
| 5. useFeedPosts → useCurrentUser | ✅ Hoàn tất |
| 6. Siết RLS pplp_action_caps / system_config | ✅ Tạo views + restrict policies |
| 7. CommentSection realtime channels | ❌ Chưa fix — vẫn tạo channel per post |
| 8. Xóa Edge Functions deprecated | ❌ `live-recording-start`, `live-recording-stop`, `agora-token` vẫn tồn tại |
| 9. Fix useState&lt;any&gt; | ⚠️ Một phần — StoriesBar đã fix, Post.tsx + admin components chưa |
| 10. Chuyển getSession → useCurrentUser | ⚠️ Một phần — FacebookLeftSidebar, Friends đã fix; FacebookRightSidebar, Post.tsx chưa |

---

## II. PHÁT HIỆN VÒNG 4

### 1. God Component: `FacebookCreatePost.tsx` = 1.064 dòng ⚠️ (Chưa refactor)

Đây là file lớn nhất trong codebase. Chứa:
- 25+ useState hooks (dòng 55-96)
- Upload queue management (parallel images + Uppy video)
- Drag & drop handling
- Friend tagging, location, feeling/activity, privacy, emoji
- Content validation + zod schema
- Submit flow 5 bước (auth → prepare_media → saving → done)
- Watchdog timeout + abort controller
- Guest mode placeholder UI (dòng 549-610)
- Full dialog UI (~500 dòng JSX)

**Đề xuất tách:**
- `useCreatePost.ts` (~250 dòng): submit logic, validation, auth, abort
- `CreatePostMediaManager.tsx` (~250 dòng): upload queue, Uppy, drag/drop, media preview
- `CreatePostToolbar.tsx` (~100 dòng): emoji, friend tag, location, feeling, privacy buttons
- `FacebookCreatePost.tsx` (~300 dòng): guest mode + dialog shell + compose area

### 2. `Post.tsx` — vẫn dùng `useState<any>` + `getSession()`

- Dòng 18: `useState<any>(null)` cho post data
- Dòng 22-29: `getSession()` riêng thay vì `useCurrentUser()`
- Dòng 67: `(data as any).public_profiles`

**Fix:** Tạo typed `PostWithProfile` interface, dùng `useCurrentUser()`.

### 3. `FacebookRightSidebar.tsx` — `useState<any[]>` + `getSession()`

- Dòng 15: `useState<any[]>([])` cho contacts
- Dòng 22: `getSession()` trực tiếp thay vì `useCurrentUser()`

**Fix:** Tạo `OnlineContact` interface, nhận `currentUserId` từ props hoặc dùng `useCurrentUser()`.

### 4. Security Scan — 2 findings chưa xử lý

| Finding | Mức | Trạng thái |
|---------|-----|-----------|
| Leaked Password Protection Disabled | WARN | Cần bật thủ công |
| RLS Policy Always True | WARN | Đã ignore — by design |
| Tables RLS coverage (93 tables) | WARN | Cần verify `reel_views`, `pplp_device_registry`, `fun_pool_config` |

### 5. Console.log — 1.821 matches trong 103 files

`vite.config` đã strip `console.log` trong production build, nhưng dev build vẫn chậm do log volume. Một số `console.log` trong `FacebookCreatePost.tsx` submit flow nên chuyển thành `console.debug` hoặc xóa.

### 6. Edge Functions deprecated vẫn tồn tại

| Function | Lý do xóa |
|----------|-----------|
| `live-recording-start` | Đã thay bằng chunked recording (`r2-signed-chunk-url` + `recording-finalize`) |
| `live-recording-stop` | Đã thay bằng chunked recording |
| `agora-token` | Đã thay bằng `live-token` |

### 7. `liveService.ts` — `supabase as any` (dòng 5)

Vẫn cast toàn bộ supabase client thành `any`. Comment giải thích lý do (Json type mismatch) nhưng bypass hoàn toàn type safety cho 536 dòng code.

### 8. `as any` — 438 instances trong 46 files

Giảm rất ít từ vòng 3 (438 vs 438). Phần lớn tập trung ở:
- `ProfileHeader.tsx` (profile wallet addresses)
- `AvatarOrbit.tsx` (social_links JSON)
- `DonationHistoryTab.tsx` (card_theme/background/sound)
- `MessageBubble.tsx` (metadata sticker/red_envelope)
- `Profile.tsx` (social_links, setProfile)
- Chat module (message metadata)

Nguyên nhân gốc: database `Json` type không match với TypeScript interfaces → phải cast.

---

## III. ĐIỂM TỔNG KẾT (Vòng 4)

| Hạng mục | Vòng 3 | Vòng 4 | Thay đổi |
|----------|--------|--------|----------|
| Auth/Session | 7.0 | 8.5 | ↑ (5 listeners tất cả cần thiết, getUser=0) |
| Type Safety | 6.0 | 6.5 | ↑ nhẹ (StoriesBar fixed, còn Post.tsx + admin) |
| Hiệu năng | 7.5 | 7.5 | = (comment channels chưa fix) |
| Bảo mật | 6.5 | 7.5 | ↑ (RLS tightened, views created) |
| Code Quality | 7.0 | 7.0 | = (CreatePost 1064 dòng chưa refactor) |
| Architecture | 7.5 | 7.5 | = |
| **Tổng (weighted)** | **6.9** | **7.4** | **+0.5** |

---

## IV. ĐỀ XUẤT CẢI THIỆN — 8 ĐIỂM

### HIGH PRIORITY

**1. Refactor `FacebookCreatePost.tsx` (1.064 → ~300 dòng)**
- Tách `useCreatePost.ts`: submit logic, validation, auth refresh, abort controller, PPLP evaluate
- Tách `CreatePostMediaManager.tsx`: upload queue, Uppy, drag/drop, media grid preview
- Tách `CreatePostToolbar.tsx`: add-to-post icon bar (media, friend tag, location, feeling, emoji)
- `FacebookCreatePost.tsx` giữ lại: guest placeholder, dialog shell, compose area

**2. Fix `Post.tsx` — type safety + useCurrentUser**
- Tạo `PostWithProfile` interface (thay `any`)
- Dùng `useCurrentUser()` thay `getSession()`
- Fix `(data as any).public_profiles` bằng typed query result

**3. Fix `FacebookRightSidebar.tsx` — type safety + useCurrentUser**
- Tạo `OnlineContact` interface
- Dùng `useCurrentUser()` thay `getSession()`

**4. Xóa 3 Edge Functions deprecated**
- `live-recording-start/index.ts`
- `live-recording-stop/index.ts`
- `agora-token/index.ts`
- Xóa entries tương ứng trong `supabase/config.toml`

### MEDIUM PRIORITY

**5. Fix `useState<any>` còn lại (5 files admin)**
- `AllTransactions.tsx`: Tạo `TransactionData` interface
- `ManualDonation.tsx`: Tạo `DonationResult` interface
- `PplpMintTab.tsx`: Tạo `SnapshotResult` interface
- `SystemTab.tsx`: Tạo typed result interfaces cho backfill, delete, scan
- `TransactionLookup.tsx`: Tạo `TxLookupResult` interface

**6. Verify RLS cho tables chưa rõ**
- Chạy query kiểm tra: `reel_views`, `pplp_device_registry`, `fun_pool_config`, `reports`
- Enable RLS nếu chưa có

**7. CommentSection — debounce realtime channel**
- Chỉ tạo channel khi component mount ≥ 500ms (ngăn scroll-through spam)
- Hoặc: limit tối đa 3 concurrent comment channels

### LOW PRIORITY

**8. Fix `liveService.ts` — giảm `as any` scope**
- Thay vì cast toàn bộ `supabase as any`, chỉ cast tại điểm insert/update metadata
- Tạo typed helper function cho metadata operations

---

## V. CHI TIẾT KỸ THUẬT

### FacebookCreatePost Refactor (Điểm 1)

```text
HIỆN TẠI (1 file, 1.064 dòng):
  FacebookCreatePost.tsx
    ├── 25+ useState hooks
    ├── Upload queue init + subscribe
    ├── beforeunload handler
    ├── Profile fetch
    ├── File select + validation
    ├── Drag & drop
    ├── Uppy video upload
    ├── Submit 5 steps (auth→media→save→done)
    ├── Abort controller + watchdog
    ├── Guest mode placeholder (~60 dòng)
    ├── Authenticated card trigger
    └── Full Dialog (500+ dòng JSX)

SAU REFACTOR (4 files):
  useCreatePost.ts (~250 dòng)
    ├── Profile query (useCurrentUser + supabase)
    ├── Submit handler (auth, media collect, edge function call)
    ├── Abort controller + watchdog
    ├── Validation (zod)
    ├── PPLP evaluate
    └── State: loading, submitStep, content, privacy, feeling, location, taggedFriends

  CreatePostMediaManager.tsx (~250 dòng)
    ├── Upload queue (init, subscribe, add, remove, reorder, retry)
    ├── Uppy video upload integration
    ├── Drag & drop zone
    ├── beforeunload guard
    └── Media preview grid

  CreatePostToolbar.tsx (~100 dòng)
    ├── Icon buttons (photo, friend tag, emoji, location, feeling, GIF, more)
    └── State indicators (tagged count, location set, feeling active)

  FacebookCreatePost.tsx (~300 dòng)
    ├── Guest mode card
    ├── Authenticated trigger card
    ├── Dialog shell
    ├── Compose area (avatar, content textarea, char counter)
    ├── <CreatePostMediaManager />
    ├── <CreatePostToolbar />
    ├── Submit button
    └── Sub-dialogs (FriendTag, Location, Feeling)
```

