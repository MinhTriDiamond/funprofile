

# Sửa lỗi tặng quà trong Reels báo "chưa kết nối ví"

## Nguyên nhân

Trong `ReelsFeed.tsx` dòng 123-130, khi tạo `giftRecipient` để truyền vào dialog tặng quà, `walletAddress` và `btcAddress` đều bị gán cứng là `null`:

```tsx
const giftRecipient = currentReel?.profiles ? {
  ...
  walletAddress: null,   // ← luôn null
  btcAddress: null,      // ← luôn null
  ...
} : null;
```

Đồng thời, truy vấn Reels trong `useReels.ts` (dòng 64) chỉ lấy `id, username, avatar_url, full_name` từ bảng `profiles`, **không lấy `wallet_address` và `btc_address`**.

→ Dialog tặng quà luôn thấy người nhận "chưa có ví" dù thực tế họ đã kết nối ví.

## Giải pháp

### 1. Cập nhật query trong `src/hooks/useReels.ts` (dòng 64)

Thêm `wallet_address` và `btc_address` vào phần select profiles:

```tsx
// Trước
.select('*, profiles:user_id (id, username, avatar_url, full_name), slug')

// Sau
.select('*, profiles:user_id (id, username, avatar_url, full_name, wallet_address, btc_address), slug')
```

Cập nhật luôn type `Reel` ở đầu file để bao gồm 2 trường mới trong `profiles`.

### 2. Cập nhật `giftRecipient` trong `src/components/reels/ReelsFeed.tsx` (dòng 123-130)

Sử dụng giá trị thực từ profiles thay vì `null`:

```tsx
const giftRecipient = currentReel?.profiles ? {
  id: currentReel.profiles.id,
  username: currentReel.profiles.username || '',
  displayName: currentReel.profiles.full_name || null,
  walletAddress: currentReel.profiles.wallet_address || null,
  btcAddress: currentReel.profiles.btc_address || null,
  avatarUrl: currentReel.profiles.avatar_url,
} : null;
```

## File cần sửa
- `src/hooks/useReels.ts` — thêm 2 trường vào query + type
- `src/components/reels/ReelsFeed.tsx` — dùng wallet thực từ profiles

Chỉ sửa **2 file**, mỗi file 1-2 dòng.

