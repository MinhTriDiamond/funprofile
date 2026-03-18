

## Plan: Ghi nhận Swap vào database + cập nhật tổng kết

### Phân tích vấn đề

Hiện tại swap token (qua PancakeSwap) **không được ghi vào database**. Khi user swap CAMLY → USDT hoặc ngược lại, giao dịch chỉ xảy ra on-chain mà không lưu lại. Vì vậy bảng tổng kết chỉ phản ánh tặng/nhận qua nút Gift, thiếu phần swap.

Với angeldieungoc: nhận 834M CAMLY, tặng 706M CAMLY qua donations. Nhưng nếu user cũng swap CAMLY → USDT thì phần CAMLY bị giảm thêm mà không hiển thị.

### Giải pháp

**1. Tạo bảng `swap_transactions`**

Bảng mới lưu mỗi lần swap thành công:
- `user_id`, `tx_hash`, `from_symbol`, `to_symbol`, `from_amount`, `to_amount`, `chain_id`, `status`, `created_at`

**2. Ghi swap vào database khi thành công (`SwapTab.tsx`)**

Sau khi `executeSwap()` trả về hash thành công, insert bản ghi vào `swap_transactions`.

**3. Cập nhật RPC `get_user_donation_summary`**

Mở rộng function để cũng tính swap:
- Swap FROM token X = giảm token X (tương tự "sent")
- Swap TO token X = tăng token X (tương tự "received")
- Cộng dồn vào summary hiện tại

**4. Cập nhật UI bảng tổng kết**

- Thêm dòng ghi chú phân biệt: giao dịch tặng/nhận vs swap
- Hoặc gộp chung vào "Tổng nhận" / "Tổng tặng" để phản ánh đúng dòng token

**5. Hiển thị swap trong danh sách lịch sử**

- Query thêm `swap_transactions` trong hook `usePublicDonationHistory`
- Hiển thị với badge "Swap" khác màu (ví dụ: tím) để phân biệt với tặng/nhận

### Lưu ý quan trọng

- Dữ liệu swap **trong quá khứ** chưa được ghi. Có thể cần quét on-chain (BscScan API) để backfill lịch sử swap cũ, hoặc chấp nhận chỉ ghi từ thời điểm này trở đi.
- Giao dịch chuyển trực tiếp từ ví ngoài (MetaMask) vào FUN.RICH vẫn không được ghi trừ khi auto-scan phát hiện.

### Thứ tự triển khai
1. Migration tạo bảng `swap_transactions` + RLS
2. Sửa `SwapTab.tsx` ghi swap sau khi thành công  
3. Sửa RPC `get_user_donation_summary` gộp swap data
4. Sửa hook + UI hiển thị swap trong lịch sử

