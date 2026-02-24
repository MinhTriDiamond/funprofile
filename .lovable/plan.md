

# Hiển thị danh sách giao dịch bị thiếu trước khi phục hồi

## Mục tiêu
Thêm nút **"Quét kiểm tra"** riêng biệt để admin xem trước danh sách tất cả giao dịch bị thiếu (chưa có donation + chưa có bài gift_celebration) TRƯỚC KHI quyết định chạy phục hồi. Giúp con kiểm tra thủ công từng giao dịch.

## Giải pháp

### 1. Thêm chế độ `scan_only` cho Edge Function `auto-backfill-donations`
- Nhận tham số `{ mode: "scan_only" }` từ request body
- Khi `scan_only = true`: chỉ quét và trả về danh sách giao dịch bị thiếu, **KHÔNG insert** gì cả
- Trả về chi tiết từng giao dịch: người gửi, người nhận, số tiền, token, tx_hash, thời gian, loại thiếu (thiếu donation / thiếu bài post / cả hai)

### 2. Cập nhật UI SystemTab
- Thêm nút **"Quét kiểm tra"** (màu xanh, icon Search) bên cạnh nút "Chạy Backfill ngay"
- Khi nhấn "Quét kiểm tra": gọi edge function với `mode: "scan_only"`, hiển thị bảng danh sách giao dịch thiếu
- Bảng hiển thị: STT, Người gửi, Người nhận, Số tiền, Token, TX Hash (rút gọn), Thời gian, Loại thiếu
- Sau khi xem xong, admin nhấn "Chạy Backfill ngay" để phục hồi

## Chi tiết kỹ thuật

### auto-backfill-donations/index.ts
```text
Thêm:
1. Parse request body để lấy { mode }
2. Nếu mode === "scan_only":
   - Vẫn chạy logic quét như cũ (tìm missing donations + missing posts)
   - KHÔNG gọi insert
   - Trả về danh sách chi tiết: missing_donations[] và missing_posts[]
   - Mỗi item gồm: tx_hash, from_address, to_address, amount, token, 
     sender_username, recipient_username, created_at, missing_type
3. Nếu không có mode hoặc mode khác: chạy backfill bình thường như hiện tại
```

### SystemTab.tsx
```text
Thêm:
1. State: scanResult, scanning
2. Nút "Quét kiểm tra" gọi edge function với { mode: "scan_only" }
3. Bảng Table hiển thị kết quả scan:
   - Cột: #, Người gửi, Người nhận, Số tiền, Token, TX Hash, Thời gian, Loại thiếu
   - Scroll được nếu nhiều dòng
   - Hiển thị tổng số giao dịch thiếu ở đầu bảng
```

### Files thay đổi
1. `supabase/functions/auto-backfill-donations/index.ts` -- Thêm mode scan_only
2. `src/components/admin/SystemTab.tsx` -- Thêm nút quét + bảng hiển thị chi tiết

