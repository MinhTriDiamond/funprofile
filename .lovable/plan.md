

# An bai viet cua user bi ban khoi feed va hien thi badge "Da bi cam" tren trang ca nhan

## Tong quan
- Bai viet cua user bi ban se bi loc khoi feed (khong xoa khoi database, chi an khoi giao dien)
- Trang ca nhan cua user bi ban van truy cap duoc, nhung hien thi badge do "Da bi cam" ben canh ten

## Thay doi

### 1. Database Migration - Them `is_banned` vao view `public_profiles`
Cap nhat view `public_profiles` de bao gom truong `is_banned`, giup frontend biet user nao bi ban ma khong can truy van bang `profiles` truc tiep.

```sql
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id, username, username_normalized, avatar_url, bio, cover_url, 
  created_at, full_name, display_name, social_links, public_wallet_address,
  is_banned
FROM profiles;
```

### 2. `src/hooks/useFeedPosts.ts` - Loc bai viet cua user bi ban
Them `is_banned` vao select cua ca 2 ham `fetchFeedPage` va `fetchHighlightedPosts`, sau do loc bo nhung bai viet co `profiles.is_banned = true`.

- Trong `fetchFeedPage` (dong 174): Them `is_banned` vao select cua `public_profiles`
- Trong `fetchHighlightedPosts` (dong 143): Tuong tu
- Sau khi map du lieu, loc bo cac post co `profiles.is_banned === true`

### 3. `src/hooks/useFeedPosts.ts` - Cap nhat interface `FeedPost`
Them truong `is_banned` vao `profiles` trong interface `FeedPost`:
```typescript
profiles: {
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
  public_wallet_address?: string | null;
  is_banned?: boolean;
};
```

### 4. `src/pages/Profile.tsx` - Hien thi badge "Da bi cam" ben canh ten
Tai dong 527-528, them badge do "Da bi cam" sau ten hien thi khi `profile.is_banned === true`:
```tsx
<h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
  {profile?.display_name || profile?.username}
  {profile?.is_banned && (
    <Badge variant="destructive" className="ml-2 text-xs align-middle">Da bi cam</Badge>
  )}
</h1>
```

Cap nhat query lay profile (dong 167-169) de bao gom `is_banned` trong select.

## Ket qua
- Feed: Bai viet cua user bi ban khong hien thi (du lieu van con trong database de kiem toan)
- Trang ca nhan: Van truy cap duoc, hien thi badge do "Da bi cam" ben canh ten
- So lieu: Khong thay doi, van giu nguyen trong he thong
