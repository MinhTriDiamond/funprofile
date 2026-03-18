

## Plan: Fix bảng tổng kết bị cắt bên phải

### Vấn đề
Dialog có `max-w-2xl` (672px) nhưng bảng 6 cột với số lớn (như `38.472.430.999`) vượt quá chiều rộng → bị cắt phía phải. Phần `overflow-x-auto` đã có nhưng dialog content trên mobile dùng `overflow-x-hidden` nên scrollbar bị ẩn.

### Giải pháp

**Sửa `src/components/profile/WalletTransactionHistory.tsx`:**
1. Tăng `max-w-2xl` → `max-w-3xl` cho DialogContent để bảng có thêm không gian
2. Thêm `overflow-x-auto` trực tiếp vào DialogContent (override `overflow-x-hidden` từ base)
3. Thu gọn text trong bảng: dùng `text-[11px]` cho số liệu, `whitespace-nowrap` cho các cell để không bị wrap lộn xộn
4. Giảm padding cell (`px-2 py-1.5`) để tiết kiệm không gian

Không thay đổi logic hay database.

