
# Gói Đóng Gói Tính Năng Reels — Chuyển Sang Fun Profile Gốc

## Tổng quan

Dưới đây là danh sách đầy đủ tất cả các file cần sao chép/cập nhật từ bản remix sang Fun Profile gốc để có tính năng Reels hoàn chỉnh.

---

## PHẦN 1: Database Migrations

Chạy 2 file SQL này theo thứ tự trên Fun Profile gốc (Run SQL trong Cloud View):

### Migration 1: Schema chính
**File:** `supabase/migrations/20260203095429_924e2200-da26-41e1-a471-10c5525d1307.sql`

Tạo 7 bảng: `reels`, `reel_likes`, `reel_comments`, `reel_comment_likes`, `reel_shares`, `reel_views`, `user_reel_preferences` + indexes + triggers + RLS policies + realtime.

### Migration 2: Bookmarks
**File:** `supabase/migrations/20260204084149_2e65be2f-aea9-4b88-86d0-751c48b197b5.sql`

Tạo bảng `reel_bookmarks` + RLS + indexes + realtime.

---

## PHẦN 2: Edge Functions (Backend)

Sao chép nguyên 2 thư mục:

| Thư mục | Chức năng |
|---------|-----------|
| `supabase/functions/get-reel-recommendations/index.ts` | API lấy danh sách reels với thuật toán AI scoring |
| `supabase/functions/analyze-reel/index.ts` | Phân tích nội dung video bằng AI |

---

## PHẦN 3: Frontend Components

### 3a. Trang (Pages)
| File | Mô tả |
|------|-------|
| `src/pages/Reels.tsx` | Trang chính của Reels |

### 3b. Components Reels (sao chép nguyên thư mục)
| File | Mô tả |
|------|-------|
| `src/components/reels/ReelsFeed.tsx` | Bảng tin cuộn dọc với hiệu ứng chuyển cảnh (transition animation) |
| `src/components/reels/ReelPlayer.tsx` | Trình phát video (play/pause/mute/speed) |
| `src/components/reels/ReelComments.tsx` | Panel bình luận trượt vào (slide-in) |
| `src/components/reels/ReelInfo.tsx` | Thông tin người tạo reel |
| `src/components/reels/CreateReelDialog.tsx` | Hộp thoại tạo reel mới |
| `src/components/reels/ShareReelDialog.tsx` | Hộp thoại chia sẻ reel |
| `src/components/reels/DoubleTapLike.tsx` | Hiệu ứng trái tim khi nhấn đôi |
| `src/components/reels/FollowButton.tsx` | Nút theo dõi |
| `src/components/reels/index.ts` | File export (KHÔNG có ReelActions) |

### 3c. Profile Section
| File | Mô tả |
|------|-------|
| `src/components/profile/ProfileReelsSection.tsx` | Tab Reels trong trang cá nhân |

---

## PHẦN 4: Hooks (Logic)

| File | Mô tả |
|------|-------|
| `src/hooks/useReels.ts` | Hook chính: fetch, like, comment, upload, view, share |
| `src/hooks/useReelBookmarks.ts` | Hook lưu/bỏ lưu reel |
| `src/hooks/useReelCommentInteractions.ts` | Hook like/reply bình luận |

---

## PHẦN 5: Cập nhật các file hiện có

### 5a. Routes — `src/App.tsx`
Thêm 2 dòng:
```tsx
const Reels = lazy(() => import("./pages/Reels"));
// ...trong Routes:
<Route path="/reels" element={<Reels />} />
<Route path="/reels/:reelId" element={<Reels />} />
```

### 5b. Navbar — `src/components/layout/FacebookNavbar.tsx`
Thêm vào mảng `iconNavItems`:
```tsx
import { Film } from 'lucide-react';
// ...
{ icon: Film, path: '/reels', label: 'Reels' },
```

### 5c. Auth Guard — `src/components/auth/LawOfLightGuard.tsx`
Cập nhật điều kiện cho phép khách truy cập (dòng 47):
```tsx
// Từ:
if (location.pathname === '/' || location.pathname === '/feed') {
// Thành:
if (location.pathname === '/' || location.pathname === '/feed' || location.pathname.startsWith('/reels')) {
```

### 5d. Translations — `src/i18n/translations.ts`
Thêm các khoá dịch (EN + VI) cho Reels. Danh sách đầy đủ:

**English:**
```
reels, noReelsYet, createReel, yourReels, savedReels, noSavedReels,
addVideo, dragAndDrop, preview, previewPlaceholder, uploadReel,
uploadingReel, sessionExpiredReel, captionReel, writeCaptionReel,
visibilityReel, publicReel, friendsOnlyReel, privateReel, saveVideo,
unsaveVideo, goBack, addComment, replyingTo, noCommentsYet, shareReel,
sendToFriends, shareReelText, selectFriend, sentToFriends, following,
follow, unfollowed, followError, reportReel, notInterested
```

**Vietnamese:** Tương ứng bản dịch tiếng Việt (xem file `translations.ts` trên bản remix).

---

## PHẦN 6: Tổng kết danh sách file

### File mới (SAO CHÉP NGUYÊN):
1. `src/pages/Reels.tsx`
2. `src/components/reels/ReelsFeed.tsx`
3. `src/components/reels/ReelPlayer.tsx`
4. `src/components/reels/ReelComments.tsx`
5. `src/components/reels/ReelInfo.tsx`
6. `src/components/reels/CreateReelDialog.tsx`
7. `src/components/reels/ShareReelDialog.tsx`
8. `src/components/reels/DoubleTapLike.tsx`
9. `src/components/reels/FollowButton.tsx`
10. `src/components/reels/index.ts`
11. `src/components/profile/ProfileReelsSection.tsx`
12. `src/hooks/useReels.ts`
13. `src/hooks/useReelBookmarks.ts`
14. `src/hooks/useReelCommentInteractions.ts`
15. `supabase/functions/get-reel-recommendations/index.ts`
16. `supabase/functions/analyze-reel/index.ts`

### File cần cập nhật (CHỈNH SỬA):
1. `src/App.tsx` — Thêm routes
2. `src/components/layout/FacebookNavbar.tsx` — Thêm tab Reels
3. `src/components/auth/LawOfLightGuard.tsx` — Cho phép khách vào /reels
4. `src/i18n/translations.ts` — Thêm bản dịch EN/VI

### Database (CHẠY SQL):
1. Migration 1: Schema chính (7 bảng + triggers + RLS)
2. Migration 2: Bookmarks (1 bảng + RLS)

---

## Thứ tự thực hiện

1. Chạy Migration 1 SQL
2. Chạy Migration 2 SQL
3. Sao chép 16 file mới
4. Cập nhật 4 file hiện có
5. Deploy edge functions
6. Test tại /reels
