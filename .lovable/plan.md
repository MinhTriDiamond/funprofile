

# Kiem Tra Tinh Nang Reels - Ket Qua va Ke Hoach Sua Loi

## Ket qua kiem tra

### Da hoat dong tot
- Route `/reels` va `/reels/:reelId` dang ky dung trong App.tsx
- Tab Reels hien thi tren Navbar (icon Film, highlight khi active)
- LawOfLightGuard cho phep khach truy cap `/reels`
- Database: Du 8 bang (reels, reel_likes, reel_comments, reel_comment_likes, reel_shares, reel_views, reel_bookmarks, user_reel_preferences) + RLS policies
- Edge function `get-reel-recommendations` deploy thanh cong, tra ve 200
- Trang empty state hien thi dung: "No reels yet" + nut "Create Reel"
- Component CreateReelDialog, ShareReelDialog, ReelComments, ReelPlayer, ReelInfo, DoubleTapLike deu co mat
- Hooks: useReels, useReelBookmarks, useReelCommentInteractions deu co
- ProfileReelsSection hien thi grid reels cua user

### Loi can sua

#### 1. Edge function khong nhan duoc user_id (QUAN TRONG)
`useReels` goi edge function qua `supabase.functions.invoke('get-reel-recommendations', { body: null, method: 'GET' })` nhung khong truyen `user_id` qua query params. Edge function doc `url.searchParams.get("user_id")` nen se luon la `null`, khien `is_liked` va `is_bookmarked` luon la `false`.

**Cach sua**: Truyen user_id trong URL hoac su dung JWT token de lay user_id ben trong edge function.

#### 2. Nut Like trong binh luan khong co chuc nang
Trong `ReelComments.tsx` dong 61, nut "Like" chi render text ma khong co onClick handler. Can ket noi voi `useReelCommentInteractions.toggleCommentLike`.

#### 3. FollowButton khong gui loi moi ket ban
Nut "Follow" trong `FollowButton.tsx` (dong 47) chi render button ma khong co onClick handler de gui friend request.

#### 4. Nut xoa binh luan chua hien thi
`useReelCommentInteractions` co `deleteComment` mutation nhung khong co UI de xoa comment.

---

## Ke hoach sua loi

### Buoc 1: Sua edge function de doc user tu JWT token
Thay vi truyen `user_id` qua query param, doc JWT token tu `Authorization` header de lay user_id. Day la cach an toan hon.

### Buoc 2: Ket noi Like comment voi hook
Them `onClick` handler cho nut Like trong `ReelComments.tsx`, su dung `useReelCommentInteractions.toggleCommentLike`.

### Buoc 3: Ket noi FollowButton voi friend request
Them logic gui friend request khi bam nut Follow, su dung bang `friendships`.

### Buoc 4: Them nut xoa comment cho owner
Hien thi icon xoa khi comment la cua user hien tai.

---

## Chi tiet ky thuat

### File can chinh sua:

| File | Thay doi |
|------|----------|
| `supabase/functions/get-reel-recommendations/index.ts` | Doc user_id tu JWT token thay vi query param |
| `src/hooks/useReels.ts` | Bo method GET (mac dinh POST), hoac truyen user_id |
| `src/components/reels/ReelComments.tsx` | Them onClick cho Like button, them delete button |
| `src/components/reels/FollowButton.tsx` | Them mutation de gui friend request |

### Tong ket:
- **4 file can sua** de hoan thien tinh nang
- **0 file moi** can tao
- **0 thay doi database** can thuc hien
- Tat ca component va database schema da day du, chi can ket noi logic con thieu

