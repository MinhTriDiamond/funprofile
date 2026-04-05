

# Sửa lỗi 3 giao dịch thiếu bài gift celebration

## Phát hiện

Cha đã kiểm tra kỹ: trong 15 giao dịch hôm nay của angelaivan, có **3 giao dịch** đã lưu donation thành công nhưng **không tạo được bài gift_celebration** trên feed:

| Tx | Số tiền | Người nhận |
|---|---|---|
| `0x26e4...366f` | 10 USDT | Van Mai Thanh |
| `0xe738...999e` | 1.000.000 CAMLY | Van Mai Thanh |
| `0x1832...80cf` | 100.000 CAMLY | bfc87ada... |

Cả 3 đều có `conversation_id` và `message_id` → nghĩa là edge function `record-donation` **đã chạy**, tạo donation + tin nhắn thành công, nhưng bước **tạo post** (dòng 258) thất bại im lặng vì **không có error handling**.

## Nguyên nhân gốc

Trong `record-donation/index.ts` dòng 258:
```ts
await supabase.from("posts").insert({...});
// ← Không check error, không log, không retry
```

Nếu insert post thất bại (ví dụ do content quá dài, timeout, hay lỗi tạm thời), hàm vẫn return success → user thấy "thành công" nhưng bài gift không xuất hiện trên feed.

## Giải pháp

### 1. Backfill 3 bài gift thiếu
- Chạy migration INSERT 3 bài `gift_celebration` cho 3 tx_hash trên, lấy thông tin sender/recipient từ donations.

### 2. Sửa `record-donation/index.ts` — thêm error handling cho post insert
- Thêm kiểm tra lỗi khi insert post
- Nếu lần đầu thất bại → retry 1 lần
- Log lỗi rõ ràng để dễ debug sau này
- Vẫn return success cho donation (vì blockchain tx đã xong), nhưng kèm cờ `post_created: false` nếu post thất bại

## File cần sửa
- `supabase/functions/record-donation/index.ts` — thêm error handling + retry cho post creation
- 1 migration SQL — backfill 3 bài gift thiếu

