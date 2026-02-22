

# Fix Guest View - Hien thi day du thong tin cho khach (Guest)

## Van de

Khi Guest (chua dang nhap) vao xem trang, ten nguoi dung hien thi "@Unknown" va avatar la "?" vi:
- Cac truy van su dung FK join vao bang `profiles` (VD: `profiles!posts_user_id_fkey`)
- Bang `profiles` **khong co SELECT policy cho anon** - chi cho authenticated users
- Guest khong doc duoc `profiles` nen cac FK join tra ve `null`

## Giai phap

Thay tat ca FK join tu `profiles!...fkey` sang `public_profiles!...fkey` trong cac trang Guest co the xem. View `public_profiles` da ton tai va co the doc boi anon.

Cot co trong `public_profiles`: id, username, avatar_url, bio, cover_url, created_at, full_name, display_name, social_links, public_wallet_address.

## Database Migration

Them cot `username_normalized` vao view `public_profiles` de ho tro tim kiem trong InlineSearch:

```text
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id, username, username_normalized, avatar_url, bio, cover_url, 
  created_at, full_name, display_name, social_links, public_wallet_address
FROM profiles;
```

## Cac file can thay doi

### 1. `src/hooks/useFeedPosts.ts` (2 cho)

- `fetchHighlightedPosts`: Doi `profiles!posts_user_id_fkey (...)` thanh `public_profiles!posts_user_id_fkey (username, display_name, avatar_url, public_wallet_address)`
- `fetchFeedPage`: Tuong tu
- Bo cac cot `external_wallet_address`, `custodial_wallet_address`, `wallet_address`
- Cap nhat interface `FeedPost.profiles` tuong ung

### 2. `src/pages/Post.tsx` (1 cho)

- Doi FK join sang `public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address)`
- Bo `external_wallet_address`, `custodial_wallet_address`

### 3. `src/pages/Profile.tsx` (4 cho)

- `fetchProfile`: Khi xem profile nguoi khac (khong phai own profile) va chua dang nhap, dung `public_profiles` thay vi `profiles`
- 3 truy van posts: Doi FK join sang `public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address)`

### 4. `src/components/feed/StoriesBar.tsx` (1 cho)

- Doi FK join sang `public_profiles!posts_user_id_fkey(id, username, avatar_url)`

### 5. `src/components/layout/InlineSearch.tsx` (2 cho)

- Doi truy van profiles tu `supabase.from('profiles')` thanh `supabase.from('public_profiles')`
- Doi FK join posts sang `public_profiles!posts_user_id_fkey (username, avatar_url)`

### 6. `src/components/feed/FacebookPostCard.tsx`

- Cap nhat interface `profiles` bo `external_wallet_address`, `custodial_wallet_address`, `wallet_address` (chi giu `public_wallet_address`)

### 7. `src/hooks/useDonationHistory.ts`

- Doi FK join sang `public_profiles!donations_sender_id_fkey(...)` va `public_profiles!donations_recipient_id_fkey(...)`
- Bo `custodial_wallet_address`

### 8. `src/hooks/useAdminDonationHistory.ts` (3 cho)

- Doi FK join tuong tu
- Doi `supabase.from('profiles')` thanh `supabase.from('public_profiles')` cho search username

## Tac dong

- Guest se thay day du ten nguoi dung, avatar va thong tin cong khai giong nhu khi da dang nhap
- Guest chi xem, khong tuong tac (like, comment, share, chat...) - can dang nhap
- Nguoi dung da dang nhap van hoat dong binh thuong
- Khong can thay doi RLS policy
- Bao mat: chi hien thi cot an toan tu view `public_profiles`

