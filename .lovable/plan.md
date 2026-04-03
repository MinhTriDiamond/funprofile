

# Sửa hiển thị BTC từ ví ngoài giống USDT (Hình 1)

## Nguyên nhân

Khi `scan-btc-transactions` tạo bài viết gift_celebration cho giao dịch BTC từ ví ngoài, metadata chỉ có `{ chain_family: "bitcoin" }` — **thiếu** `is_external`, `sender_address`, `sender_name`.

Trong khi đó, `GiftCelebrationCard` kiểm tra tại dòng 132:
```tsx
const isExternalGift = !post.gift_sender_id && postMeta?.is_external === true;
```

Vì `is_external` không có trong metadata của post → card không hiển thị kiểu "Ví ngoài" (avatar 🌐, badge cam, địa chỉ rút gọn) như USDT ở Hình 1.

Ngoài ra, dedup post theo `tx_hash` đơn lẻ (dòng 386) khiến 1 TX gửi cho nhiều người chỉ tạo được 1 post.

## Thay đổi

### 1. File: `supabase/functions/scan-btc-transactions/index.ts` (dòng 373)

Truyền đầy đủ metadata từ donation sang post:

```typescript
// Hiện tại
metadata: { chain_family: "bitcoin" },

// Sửa thành
metadata: d.metadata,
```

Như vậy post sẽ kế thừa `is_external: true`, `sender_address`, `sender_name` từ donation — giống cách EVM external đang hoạt động.

### 2. File: `supabase/functions/scan-btc-transactions/index.ts` (dòng 384-386)

Sửa dedup post theo `tx_hash + recipient_id` thay vì chỉ `tx_hash`:

```typescript
// Hiện tại
const existingPostSet = new Set((existingPosts || []).map(p => p.tx_hash));
const newPosts = postsToInsert.filter(p => !existingPostSet.has(p.tx_hash as string));

// Sửa thành
const existingPostSet = new Set((existingPosts || []).map(p => `${p.tx_hash}__${p.gift_recipient_id}`));
const newPosts = postsToInsert.filter(p => !existingPostSet.has(`${p.tx_hash}__${p.gift_recipient_id}`));
```

Và cập nhật query select thêm `gift_recipient_id`:
```typescript
.select("tx_hash, gift_recipient_id")
```

### 3. File: `supabase/functions/scan-btc-transactions/index.ts` (dòng 378)

Dedup `postsToInsert` trước khi check DB, theo `tx_hash + recipient_id`:

```typescript
const postDedupKey = (p: Record<string, unknown>) => `${p.tx_hash}__${p.gift_recipient_id}`;
const dedupedPostsToInsert = Array.from(
  new Map(postsToInsert.map(p => [postDedupKey(p), p])).values()
);
```

## Kết quả mong đợi

- BTC từ ví ngoài sẽ hiển thị avatar 🌐, tên "Ví ngoài", địa chỉ rút gọn, badge cam — giống USDT ở Hình 1
- Mỗi người nhận trong cùng 1 TX đều có post riêng
- Không cần sửa GiftCelebrationCard vì logic detect đã đúng, chỉ thiếu data

## Chi tiết kỹ thuật
```text
File cần sửa: supabase/functions/scan-btc-transactions/index.ts
Dòng 373: metadata: d.metadata (thay vì hardcode)
Dòng 378-386: dedup post theo tx_hash + gift_recipient_id
```

