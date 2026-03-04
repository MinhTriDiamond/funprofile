

# AUDIT TOÀN DIỆN FUN PROFILE — BÁO CÁO CTO (Vòng 5)

---

## I. TIẾN ĐỘ TỪ AUDIT VÒNG 4

| Điểm | Trạng thái |
|------|-----------|
| 1. Refactor FacebookCreatePost | ✅ 1.064 → 313 dòng (tách useCreatePost, CreatePostMediaManager, CreatePostToolbar) |
| 2. Fix Post.tsx type safety + useCurrentUser | ✅ useCurrentUser done, ⚠️ `(data as any).public_profiles` vẫn còn (dòng 81) |
| 3. Fix FacebookRightSidebar | ✅ Hoàn tất (OnlineContact interface + useCurrentUser) |
| 4. Xóa Edge Functions deprecated | ✅ live-recording-start, live-recording-stop, agora-token đã xóa |
| 5. Fix useState\<any\> admin | ⚠️ ESLint comments added nhưng vẫn dùng `any` |
| 6. Verify RLS | ⚠️ Chưa verify reel_views, pplp_device_registry, fun_pool_config |
| 7. CommentSection debounce | ✅ 500ms debounce added |
| 8. Fix liveService as any | ⚠️ Vẫn cast toàn bộ `supabase as any` dòng 5 |

---

## II. PHÁT HIỆN MỚI VÒNG 5

### 1. BUG: CommentSection `cleanupRef` khai báo SAU khi sử dụng (dòng 80-84) ⚠️

```text
Dòng 81: cleanupRef.current = () => supabase.removeChannel(channel);  // dùng ở đây
Dòng 84: const cleanupRef = { current: () => {} };  // khai báo ở đây
```

JavaScript hoisting cho `const` tạo Temporal Dead Zone — nhưng code này hoạt động vì `cleanupRef` được sử dụng bên trong callback của `setTimeout` (đã resolve vào thời điểm chạy). Tuy nhiên đây là **code smell nghiêm trọng** — dễ gây nhầm lẫn và break nếu ai refactor mà không hiểu closure timing. Cần di chuyển khai báo `cleanupRef` lên trước `setTimeout`.

### 2. Duplicate file: `useTypingIndicator` tồn tại 2 bản

| File | Dùng bởi |
|------|----------|
| `src/hooks/useTypingIndicator.ts` (93 dòng) | `MessageThread.tsx` |
| `src/modules/chat/hooks/useTypingIndicator.ts` (91 dòng) | Không ai import (dead code) |

Cả hai gần giống nhau. Bản trong `modules/chat/hooks` là dead code — nên xóa.

### 3. Dead code: `streamService.ts` — module cũ

`src/modules/live/streamService.ts` cast `supabase as any`, chứa hàm `uploadStreamVideo` và `createStreamRecord` (insert vào bảng `streams`). Chỉ được import bởi `LiveStream.tsx`. Bảng `streams` không xuất hiện ở bất kỳ query nào khác — có khả năng là legacy code từ trước khi chuyển sang chunked recording.

### 4. `useProfile.ts` — vẫn dùng `any[]` cho posts (dòng 58-59)

```typescript
const [allPosts, setAllPosts] = useState<any[]>([]);
const [originalPosts, setOriginalPosts] = useState<any[]>([]);
```

Và `social_links` vẫn typed `any[]` (dòng 27). Toàn bộ `mapProfiles` function (dòng 121-124) cast `any` cho mọi post.

### 5. `Post.tsx` — `(data as any).public_profiles` vẫn tồn tại (dòng 81)

Query trả về `public_profiles` nhưng TypeScript không biết vì Supabase types dùng tên relation khác. Cần thêm type assertion đúng cách hoặc rename trong select.

### 6. Security Scan — tăng lên 18 findings (từ 15)

Phát hiện mới so với vòng 4:

| Finding | Mức |
|---------|-----|
| `live_messages` — tin nhắn livestream public readable | ERROR |
| `comments` — bình luận public readable | ERROR |
| `reactions` — reactions public readable | ERROR |

Tất cả 3 mục trên là **by design** (social network công khai), nhưng nên đánh dấu là acknowledged để không báo lại mỗi vòng.

### 7. `CreatePostMediaManager.tsx` — useEffect missing deps (dòng 60-74)

```typescript
useEffect(() => { ... }, []); // eslint sẽ warn thiếu t, uploadQueueRef, setUploadItems
```

Upload queue chỉ nên init 1 lần, nhưng nên dùng `useRef` thay vì phụ thuộc vào empty deps array.

### 8. `console.log` — 516 matches trong 25 files

Các file có nhiều nhất:
- `useSendToken.ts`: 10 console.log (debug transaction flow)
- `CallContext.tsx`: 4 console.log
- `SocialLogin.tsx`: 2 console.log
- `UnifiedGiftSendDialog.tsx`: 2 console.log

Mặc dù `vite.config` strip console.log trong production, dev experience vẫn bị ảnh hưởng. Nên chuyển sang `logger.debug()` từ `src/lib/logger.ts` đã có sẵn.

### 9. 82 Edge Functions — vẫn rất nhiều

Sau khi xóa 3 deprecated functions, vẫn còn 82 edge functions. Một số nhóm có thể consolidate:
- **SSO group**: 13 functions (`sso-*`) — có thể merge thành 2-3 router functions
- **PPLP group**: 8 functions (`pplp-*`) — có thể merge thành 1 router
- **Admin group**: 6 functions (`admin-*`) — có thể merge thành 1 router

Tuy nhiên đây là optimization dài hạn, không ảnh hưởng chức năng.

---

## III. ĐIỂM TỔNG KẾT (Vòng 5)

| Hạng mục | Vòng 4 | Vòng 5 | Thay đổi |
|----------|--------|--------|----------|
| Auth/Session | 8.5 | 8.5 | = (đã tối ưu, không còn vấn đề) |
| Type Safety | 6.5 | 6.5 | = (useProfile any[], Post.tsx as any, social_links) |
| Hiệu năng | 7.5 | 8.0 | ↑ (debounce comments, refactored CreatePost) |
| Bảo mật | 7.5 | 7.5 | = (18 findings, phần lớn by design) |
| Code Quality | 7.0 | 8.0 | ↑ (CreatePost refactored, nhưng cleanupRef bug + dead code) |
| Architecture | 7.5 | 8.0 | ↑ (clean separation of concerns) |
| **Tổng (weighted)** | **7.4** | **7.8** | **+0.4** |

---

## IV. ĐỀ XUẤT CẢI THIỆN — 8 ĐIỂM

### HIGH PRIORITY

**1. Fix CommentSection cleanupRef hoisting bug**
- Di chuyển `const cleanupRef = { current: () => {} }` lên TRƯỚC `setTimeout`
- Đảm bảo code rõ ràng cho bất kỳ ai đọc sau

**2. Xóa dead code: `src/modules/chat/hooks/useTypingIndicator.ts`**
- File này không được import bởi bất kỳ component nào
- Bản chính nằm ở `src/hooks/useTypingIndicator.ts`

**3. Fix `Post.tsx` — xóa `as any` cho public_profiles**
- Thêm `public_profiles` vào `PostWithProfile` interface
- Hoặc rename alias trong Supabase select: `profiles:public_profiles!...(...)`

**4. Fix `useProfile.ts` — type posts và social_links**
- Tạo `ProfilePost` interface thay cho `any[]`
- Thay `social_links?: any[]` bằng `social_links?: Array<{ platform: string; url: string }>` (hoặc tương đương)

### MEDIUM PRIORITY

**5. Chuyển console.log → logger.debug() (6 core files)**
- `useSendToken.ts`, `CallContext.tsx`, `SocialLogin.tsx`, `UnifiedGiftSendDialog.tsx`, `AvatarEditor.tsx`, `App.tsx`
- Sử dụng `logger` từ `src/lib/logger.ts` đã tồn tại

**6. Review & xóa `streamService.ts` nếu là dead code**
- Verify bảng `streams` có còn dữ liệu cần thiết không
- Nếu đã chuyển hoàn toàn sang chunked recording → xóa file và update LiveStream.tsx

**7. Fix CreatePostMediaManager useEffect deps**
- Chuyển upload queue init vào useRef pattern để tránh ESLint warnings và đảm bảo init đúng 1 lần

### LOW PRIORITY

**8. Acknowledge security findings (by design)**
- Đánh dấu 12 findings (profiles, donations, comments, reactions, live_messages, etc.) là "acknowledged — public by design"
- Giảm noise cho các vòng audit sau

---

## V. CHI TIẾT KỸ THUẬT

### CommentSection cleanupRef Fix (Điểm 1)
```text
TRƯỚC:
  setTimeout(() => {
    ...
    cleanupRef.current = () => supabase.removeChannel(channel);  // dùng
  }, 500);
  const cleanupRef = { current: () => {} };  // khai báo sau

SAU:
  const cleanupRef = { current: () => {} };  // khai báo trước
  const channelTimer = setTimeout(() => {
    ...
    cleanupRef.current = () => supabase.removeChannel(channel);
  }, 500);
```

### Post.tsx as any Fix (Điểm 3)
```text
TRƯỚC:
  const profileData = (data as any).public_profiles || (data as any).profiles;

SAU:
  // Rename relation alias in select query
  .select(`*, profiles:public_profiles!posts_user_id_fkey(...), reactions(...), comments(id)`)
  // Giờ data.profiles đã typed đúng, không cần cast
```

