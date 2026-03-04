

# AUDIT TOÀN DIỆN FUN PROFILE — BÁO CÁO CTO (Vòng 6)

---

## I. TIẾN ĐỘ TỪ AUDIT VÒNG 5

| Điểm | Trạng thái |
|------|-----------|
| 1. Fix CommentSection cleanupRef | ✅ Hoàn tất |
| 2. Xóa dead code useTypingIndicator duplicate | ✅ Hoàn tất |
| 3. Fix Post.tsx `as any` | ✅ Query alias `profiles:public_profiles` + typed `PostWithProfile` |
| 4. Fix useProfile social_links type | ✅ Typed interface |
| 5. Chuyển console.log → logger | ⚠️ Chỉ 2/6 files (useSendToken, SocialLogin). Còn 458 matches / 23 files |
| 6. Xóa streamService.ts | ❌ Chưa thực hiện — vẫn tồn tại, LiveStream.tsx vẫn import |
| 7. Fix CreatePostMediaManager useEffect deps | ❌ Vẫn empty deps `[]` dòng 74 |
| 8. Acknowledge security findings | ❌ Chưa mark — scan vẫn trả 13 findings |

---

## II. PHÁT HIỆN MỚI VÒNG 6

### 1. Dead Code: `streamService.ts` + `LiveStream.tsx` — Hệ thống cũ chưa dọn

`LiveStream.tsx` (249 dòng) vẫn import `streamService.ts` — cả hai là legacy code từ trước chunked recording. `streamService.ts` cast `supabase as any` và insert vào bảng `streams` (không liên quan đến `live_sessions`). Cần xác nhận bảng `streams` không còn sử dụng rồi xóa cả hai file.

### 2. `AvatarCropper.tsx` — 4 instances `any` cho react-easy-crop types

Dòng 16: `useState<any>(null)` — croppedAreaPixels
Dòng 18: `onCropChange = (crop: any)` — react-easy-crop `Point` type
Dòng 26: `(croppedArea: any, croppedAreaPixels: any)` — react-easy-crop `Area` type

react-easy-crop exports `Point` và `Area` types. Có thể import trực tiếp.

### 3. `GiftCelebrationCard.tsx` — 407 dòng, tiềm năng God Component

File này chứa logic phức tạp: confetti animation, celebration music, reaction handling, share flow, comment section, BSC scan link. Tuy chưa ở mức critical như CreatePost trước refactor, nhưng nên theo dõi.

### 4. `useProfile.ts` — Vẫn dùng `any[]` cho posts (acknowledged nhưng chưa fix)

Dòng 59-60: `useState<any[]>([])` cho allPosts/originalPosts.
Dòng 122: `mapProfiles = (posts: any[])`.
Dòng 130-171: Nhiều `any` casts cho combined posts.

Nguyên nhân: Posts có 3 shapes khác nhau (original, shared, gift_celebration) với relations khác nhau. Cần union type.

### 5. Security Scan — 13 findings (giảm từ 18)

| Finding | Mức | Cần hành động? |
|---------|-----|---------------|
| profiles public | ERROR | ⚠️ Đã có `public_profiles` view nhưng bảng gốc vẫn readable |
| financial_transactions RLS | ERROR | Cần verify policies chặt |
| platform_financial_data | ERROR | Cần verify user chỉ xem data mình |
| donations public | ERROR | By design — social transparency |
| custodial_wallets encrypted keys | ERROR | Cần verify encryption + key management |
| wallet_history | WARN | Cần verify RLS chặt |
| login_ip_logs | WARN | Cần data retention policy |
| live_sessions public | WARN | Đã có view, acknowledge |
| comments public | WARN | By design |
| reactions public | WARN | By design |
| light_reputation public | INFO | By design — transparency |
| system_config public | INFO | Đã có view, acknowledge |
| RLS always true | WARN | Review specific policies |

Findings mới so vòng 5: `financial_transactions` và `platform_financial_data` xuất hiện lần đầu. `custodial_wallets` encryption warning cũng mới.

### 6. `getSession()` — vẫn 380 matches / 45 files

Phần lớn là legitimate (utility functions, edge function calls cần access_token). Nhưng một số component vẫn dùng getSession để tạo local state thay vì `useCurrentUser`:
- `GiftNavButton.tsx`: tạo query riêng `current-user-gift` thay vì dùng `useCurrentUser`
- `FinancialTab.tsx`: `getSession()` để set `currentAdminId`
- `DeleteAccountDialog.tsx`: `getSession()` inline

### 7. `CreatePostMediaManager.tsx` — useEffect deps vẫn empty

Dòng 60-74: `useEffect(() => { ... }, [])` — thiếu deps `uploadQueueRef`, `setUploadItems`, `t`. ESLint sẽ warn. Queue chỉ nên init 1 lần, nhưng cần dùng pattern ref-guard thay vì empty deps.

### 8. Empty catch blocks — 74 instances / 8 files

Nhiều `catch {}` hoàn toàn im lặng, đặc biệt trong:
- `searchHistory.ts` (5 instances) — localStorage failures
- `ChunkedVideoPlayer.tsx` (2 instances) — mediaSource errors
- `useAgoraCall.ts` (3 instances) — client.leave() failures

Phần lớn là intentional (cleanup code không cần handle error), nhưng nên thêm comment giải thích hoặc ít nhất `catch { /* cleanup - ignore */ }`.

### 9. `handleDirectFileSelect` trong FacebookCreatePost — Dead code (dòng 80-92)

Hàm `handleDirectFileSelect` tại dòng 80-92 không thực sự xử lý files — body chỉ có comments và empty conditionals. Files được chọn qua hidden input nhưng không forward đến `CreatePostMediaManager`. Đây là logic bị hỏng sau refactor.

---

## III. ĐIỂM TỔNG KẾT (Vòng 6)

| Hạng mục | Vòng 5 | Vòng 6 | Thay đổi |
|----------|--------|--------|----------|
| Auth/Session | 8.5 | 8.5 | = (5 listeners, consolidated) |
| Type Safety | 6.5 | 7.0 | ↑ (Post.tsx fixed, AvatarCropper identified) |
| Hiệu năng | 8.0 | 8.0 | = |
| Bảo mật | 7.5 | 7.5 | = (13 findings, financial tables flagged) |
| Code Quality | 8.0 | 8.0 | = (dead code streamService, broken handleDirectFileSelect) |
| Architecture | 8.0 | 8.0 | = |
| **Tổng (weighted)** | **7.8** | **7.9** | **+0.1** |

---

## IV. ĐỀ XUẤT CẢI THIỆN — 9 ĐIỂM

### HIGH PRIORITY

**1. Fix `handleDirectFileSelect` — broken file handling**
- FacebookCreatePost.tsx dòng 80-92: hàm không forward files đến CreatePostMediaManager
- Fix: gọi `CreatePostMediaManager.handleFileSelect` qua ref hoặc expose callback từ media manager

**2. Xóa legacy `streamService.ts` + `LiveStream.tsx`**
- Verify bảng `streams` không còn dữ liệu cần giữ
- Xóa `src/modules/live/streamService.ts` 
- Xóa `src/modules/live/pages/LiveStream.tsx`
- Cập nhật routing nếu LiveStream có route

**3. Acknowledge security findings**
- Mark 7 findings by-design: donations, comments, reactions, light_reputation, system_config, live_sessions, profiles (public view exists)
- Investigate `financial_transactions` + `platform_financial_data` RLS — verify user chỉ xem data mình
- Verify `custodial_wallets` encryption standard

### MEDIUM PRIORITY

**4. Fix `CreatePostMediaManager` useEffect deps**
- Thêm ref-guard pattern: `const initialized = useRef(false); if (initialized.current) return; initialized.current = true;`
- Loại bỏ ESLint warning chính đáng

**5. Fix `AvatarCropper.tsx` — replace `any` với react-easy-crop types**
- Import `Point`, `Area` từ `react-easy-crop`
- Thay `useState<any>` → `useState<Area | null>`
- Thay `(crop: any)` → `(crop: Point)`

**6. Fix `GiftNavButton.tsx` — dùng `useCurrentUser` thay query riêng**
- Xóa `useQuery(['current-user-gift'])` duplicate
- Dùng `useCurrentUser()` trực tiếp

**7. Migrate console.log → logger (4 files còn lại)**
- `CallContext.tsx`, `UnifiedGiftSendDialog.tsx`, `AvatarEditor.tsx`, `App.tsx`
- Dùng `logger.debug()` từ `src/lib/logger.ts`

### LOW PRIORITY

**8. Type `useProfile` posts — union type**
- Tạo `ProfilePostItem = OriginalPost | SharedPost | GiftPost` union type
- Thay `any[]` cho allPosts/originalPosts
- Giảm casts trong mapProfiles/combinedPosts

**9. Document empty catch blocks**
- Thêm comment vào 74 empty catch blocks giải thích tại sao ignore error
- Pattern: `catch { /* cleanup — error irrelevant */ }`

---

## V. CHI TIẾT KỸ THUẬT

### Fix handleDirectFileSelect (Điểm 1)

```text
TRƯỚC (broken):
  const handleDirectFileSelect = async (files) => {
    if (!files) return;
    setIsDialogOpen(true);
    setShowMediaUpload(true);
    const queue = uploadQueueRef.current;
    if (queue) {
      // Empty — does nothing
    }
  };

SAU:
  // Expose handleFileSelect from CreatePostMediaManager via ref
  const mediaManagerRef = useRef<{ handleFileSelect: (files: FileList) => void }>(null);
  
  const handleDirectFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsDialogOpen(true);
    setShowMediaUpload(true);
    // Forward files to media manager
    mediaManagerRef.current?.handleFileSelect(files);
  };
```

### CreatePostMediaManager useEffect fix (Điểm 4)

```text
TRƯỚC:
  useEffect(() => {
    const queue = createUploadQueue({ ... });
    uploadQueueRef.current = queue;
    const unsubscribe = queue.subscribe(...);
    return () => { unsubscribe(); queue.destroy(); };
  }, []); // ESLint warning

SAU:
  const queueInitialized = useRef(false);
  useEffect(() => {
    if (queueInitialized.current) return;
    queueInitialized.current = true;
    const queue = createUploadQueue({ ... });
    uploadQueueRef.current = queue;
    const unsubscribe = queue.subscribe(...);
    return () => { unsubscribe(); queue.destroy(); queueInitialized.current = false; };
  }, [uploadQueueRef, setUploadItems, t]);
```

