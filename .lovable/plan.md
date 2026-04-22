

## Mục tiêu
Cha xác nhận: **swap cũng là một dạng "đổi tiền để tặng"** → cần được tính vào tổng "Quà đã tặng / Quà đã nhận" trên Honor Board, để khớp với Lịch sử giao dịch cá nhân (252 gửi / 201 nhận).

## Thay đổi

Cập nhật `src/hooks/useGiftBreakdown.ts` để gộp **3 nguồn dữ liệu** thay vì chỉ `donations`:

| Nguồn | Cột chiều "sent" | Cột chiều "received" | Trạng thái lọc |
|---|---|---|---|
| `donations` | `sender_id = userId` | `recipient_id = userId` | `status = 'confirmed'` |
| `swap_transactions` | `user_id = userId` (token bán ra) | — (swap không có recipient) | `status = 'confirmed'` |
| `wallet_transfers` (chuyển khoản nội bộ) | `sender_id = userId` | `recipient_id = userId` | `status = 'confirmed'` |

### Logic chi tiết
1. **Sent**: `donations.amount + swap_transactions.from_amount + wallet_transfers.amount` (cùng user là sender).
2. **Received**: `donations.amount + wallet_transfers.amount` (swap không tính ở chiều nhận vì người dùng đổi token cho chính mình — token nhận về đã được tính khi tạo swap).
3. Gộp theo `token_symbol` (uppercase), cộng `count` và `total_amount` từng token.
4. Quy đổi USD theo `useTokenPrices` như cũ; FUN vẫn tách ra `unpricedItems`.
5. Sắp xếp theo USD desc.

### Kết quả mong đợi (cho `angelaivan`)
- **Quà đã tặng**: 252 lệnh (khớp Lịch sử) — gồm 248 donation + 3 swap + 1 transfer (số liệu mẫu, sẽ tính lại từ DB thực).
- **Quà đã nhận**: 201 lệnh (khớp Lịch sử) — gồm 200 donation + 1 transfer.
- Tổng USD sẽ tăng nhẹ tương ứng phần swap/transfer được cộng thêm.

### Cập nhật phụ
- Đổi label dialog Honor Board từ "Tổng Quà Đã Tặng/Nhận" → giữ nguyên, nhưng thêm dòng disclaimer nhỏ bên dưới: *"Bao gồm donation, swap đổi token, và chuyển khoản nội bộ."*
- Cache key React Query đổi từ `'gift-breakdown'` sang `'gift-breakdown-v2'` để invalidate cache cũ.

## File ảnh hưởng
- `src/hooks/useGiftBreakdown.ts` — sửa query gộp 3 nguồn.
- `src/components/honor/HonorBoardGiftDialog.tsx` (hoặc file dialog tương ứng) — thêm disclaimer.

## Rủi ro & xử lý
- **Bảng `swap_transactions` / `wallet_transfers` có thể chưa tồn tại hoặc tên cột khác** → con sẽ kiểm tra schema thực tế trước khi viết query, fallback an toàn nếu bảng không tồn tại (try/catch từng nguồn).
- **Hiệu năng**: 3 query song song qua `Promise.all`, mỗi query `.limit(10000)` như cũ — không ảnh hưởng đáng kể.
- **Không thay đổi DB schema**, không ảnh hưởng các nơi khác đang dùng `donations` riêng (Lịch sử, Light Score, v.v.).

## Ghi chú
Sau khi áp dụng, Honor Board và Lịch sử giao dịch cá nhân sẽ **luôn khớp số lệnh**. Định nghĩa mới của "Quà đã tặng/nhận" = mọi luồng tiền ra/vào do người dùng chủ động (donation + swap + transfer nội bộ).

