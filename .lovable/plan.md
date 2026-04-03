

# Sửa 3 lỗi nghiêm trọng trong scan-btc-transactions khiến giao dịch BTC từ ví ngoài không hiển thị

## Nguyên nhân gốc

Sau khi kiểm tra code và database, phát hiện **3 lỗi nghiêm trọng** trong `scan-btc-transactions/index.ts`:

### Lỗi 1: Deduplication xóa mất recipient (dòng 320-322)
Khi 1 giao dịch (1 tx_hash) gửi BTC tới **nhiều địa chỉ** (ví dụ wallet 2 VÀ wallet 3), code dedup bằng `new Map(... .map(d => [d.tx_hash, d]))` — chỉ giữ **MỘT** donation per tx_hash, mất hết các recipient khác.

### Lỗi 2: Post creation crash khi sender_id = null (dòng 342)
Với giao dịch từ ví ngoài (`is_external: true`), `sender_id` là `null`. Nhưng khi tạo `gift_celebration` post, code gán `user_id: d.sender_id as string` — cột `user_id` trong bảng `posts` là **NOT NULL**, nên INSERT sẽ **FAIL** và crash toàn bộ function.

### Lỗi 3: Notification crash khi sender_id = null (dòng 391)
Tương tự, `actor_id: d.sender_id as string` gây lỗi cho giao dịch external.

**Ví wallet 1** (bc1p9pz...) **không có trong hệ thống**, nên mọi giao dịch từ nó đều là external → gặp lỗi 2+3 → function crash → không ghi nhận gì.

## Thay đổi

### File: `supabase/functions/scan-btc-transactions/index.ts`

**1. Sửa deduplication (dòng 320-322):**
Thay dedup bằng tx_hash thành dedup bằng `tx_hash + recipient_id`:
```typescript
const dedupKey = (d: Record<string, unknown>) => `${d.tx_hash}__${d.recipient_id}`;
const dedupedDonations = Array.from(
  new Map(donationsToInsert.map(d => [dedupKey(d), d])).values()
);
```

**2. Sửa post creation cho external (dòng 336-358):**
Khi `sender_id` là null (ví ngoài), dùng `recipient_id` làm `user_id` của post, và điều chỉnh nội dung:
```typescript
const postUserId = (d.sender_id || d.recipient_id) as string;
// ...
postsToInsert.push({
  user_id: postUserId,
  // ...
});
```

**3. Sửa notification cho external (dòng 387-399):**
Bỏ qua notification khi `sender_id` là null (hoặc dùng recipient_id làm actor):
```typescript
.filter(d => !existingPostSet.has(d.tx_hash as string) && d.recipient_id && d.sender_id)
```
Hoặc cho external, tạo notification kiểu khác với `actor_id = recipient_id`.

**4. Sửa chat message cho external (dòng 403-407):**
Đã có check `if (!senderId || ...)` nên sẽ skip — OK, không cần sửa.

## Kết quả mong đợi
- Giao dịch từ ví ngoài (bc1p9pz...) tới wallet 2 và wallet 3 sẽ được ghi nhận đầy đủ
- Hiển thị trên trang lịch sử với badge "Ví ngoài"
- Post gift_celebration được tạo cho người nhận
- Notification được gửi cho người nhận
- Nếu 1 TX gửi tới nhiều người, tất cả đều được ghi nhận

