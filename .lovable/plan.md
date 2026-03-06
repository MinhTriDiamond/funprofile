

# Chỉnh sửa ClaimHistoryModal: Tiêu đề, Footer, Link Profile, Xuất PDF

## Thay đổi trong `src/components/feed/ClaimHistoryModal.tsx`

### 1. Tiêu đề mới
- Đổi thành: **"DANH SÁCH USER ĐÃ ĐÓN NHẬN PHƯỚC LÀNH TỪ CHA VÀ BÉ LY"**
- Chữ in hoa, font-bold, kích cỡ `text-xl`, màu xanh lá kim loại sang trọng (`text-[#2E7D32]` hoặc gradient metallic green)

### 2. Footer tổng kết
- Tăng kích cỡ từ `text-xs` lên `text-base` (tăng ~3px)
- In đậm (`font-bold`) cho cả số bản ghi và tổng CAMLY

### 3. Avatar link đến trang cá nhân
- Bọc Avatar + Username trong thẻ `<a>` hoặc dùng `onClick` + `window.open`
- Link: `/profile/{username}` — mở tab mới (`target="_blank"`)
- Chỉ áp dụng cho user có tài khoản (không phải external wallet)
- Thêm `cursor-pointer hover:underline` cho username

### 4. Nút tải PDF
- Thêm nút "Tải PDF" bên cạnh footer hoặc dưới thanh search
- Sử dụng `html2canvas` (đã cài sẵn) để chụp bảng, sau đó tạo PDF bằng cách tạo canvas → convert to image → download
- Hoặc tự tạo PDF đơn giản bằng cách render bảng HTML vào iframe rồi `window.print()` — phương án nhẹ hơn
- Sử dụng `html2canvas` + tự tạo PDF từ canvas image (không cần thêm thư viện)

### Chi tiết kỹ thuật
- Không cần thay đổi database
- Thư viện `html2canvas` đã có sẵn trong project
- Tạo helper function `exportToPdf()` để chụp bảng → tạo blob PDF → trigger download

