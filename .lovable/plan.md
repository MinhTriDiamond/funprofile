

# Sửa Lỗi Claim FUN Money - Duplicate Detection

## Vấn Đề

Khi người dùng bấm "Claim tất cả 5241 FUN", Edge Function trả lỗi "Duplicate detected" vì:

- Trước đó, 88 mint requests đã bị reject do sai địa chỉ ví
- Các light_actions được reset (mint_status = 'approved', mint_request_id = NULL)
- NHƯNG các action IDs vẫn còn nằm trong mảng `action_ids` của các mint requests cũ (status = confirmed/signed/pending_sig)
- Edge Function kiểm tra `.overlaps('action_ids', action_ids)` -> thấy trùng -> chặn toàn bộ

## Kế Hoạch Sửa

### Bước 1: Sửa dữ liệu (Database)
Cập nhật 3 mint requests cũ (`c2ab87c0`, `4c53d680`, `d7fce8d4`) để loại bỏ các action IDs đã được reset khỏi mảng `action_ids`. Chỉ giữ lại các action IDs mà light_actions vẫn còn trạng thái pending_sig/minted/signed (thuộc về request đó thật sự).

### Bước 2: Sửa Edge Function `pplp-mint-fun`
Cải thiện logic kiểm tra trùng lặp để thông minh hơn: thay vì chỉ dùng `.overlaps()` trên mảng action_ids, kiểm tra thêm điều kiện `mint_request_id IS NOT NULL` trên bảng `light_actions` để xác nhận action thực sự đang thuộc về một request khác.

**File sửa**: `supabase/functions/pplp-mint-fun/index.ts`

Thay đổi logic anti-duplicate (khoảng dòng 95-110):
- Thay vì dùng `.overlaps('action_ids', action_ids)`, kiểm tra trực tiếp trên bảng `light_actions`
- Chỉ coi là "duplicate" nếu action có `mint_request_id IS NOT NULL` VÀ request đó có status KHÔNG phải failed/rejected

```
-- Logic mới: Chỉ chặn nếu action thực sự đang gắn với request hợp lệ
SELECT id FROM light_actions 
WHERE id IN (action_ids) 
AND mint_request_id IS NOT NULL
AND mint_status NOT IN ('approved')
```

## Tóm Tắt

| Bước | Thay Doi | Mục Dich |
|------|----------|----------|
| 1 | Dọn dữ liệu cũ trong DB | Giải phóng 23 action IDs bị kẹt |
| 2 | Sửa logic Edge Function | Ngăn lỗi tương tự xảy ra trong tương lai |

- **1 file sửa**: `supabase/functions/pplp-mint-fun/index.ts`
- **1 lần chạy SQL**: Dọn dữ liệu action_ids trong pplp_mint_requests

