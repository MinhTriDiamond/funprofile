

# Cập nhật Bảng Danh Dự + Bảng danh sách User đã Claim

## Thay đổi

### 1. Cập nhật translations (src/i18n/translations.ts)
- **Tiếng Anh (mặc định)**: `honorBoard` → `'HONOR BOARD'` (giữ nguyên), `totalCamlyClaimed` → `'Total Gifted'`
- **Tiếng Việt**: `totalCamlyClaimed` → `'Tổng Đã Tặng'`
- Thêm key mới cho modal danh sách claim: `claimHistoryTitle`, `claimDate`, `claimTime`, `claimAmount`, `noClaimHistory`
- Cập nhật tương tự cho các ngôn ngữ khác (zh, ja, ko, th, id, fr, es, de, pt, ru, ar)

### 2. Tạo component ClaimHistoryModal (src/components/feed/ClaimHistoryModal.tsx)
- Dialog/Modal hiển thị danh sách user đã claim từ bảng `reward_claims`
- Join với `profiles` để lấy: username, full_name, avatar_url, wallet_address
- Hiển thị các cột: STT, Avatar+Username, Tên, Mã ví (rút gọn), Số lượng CAMLY, Ngày rút, Giờ rút
- Sắp xếp theo `created_at` mới nhất trước
- Có thanh tìm kiếm theo username/tên/ví
- Responsive, scroll được

### 3. Cập nhật AppHonorBoard (src/components/feed/AppHonorBoard.tsx)
- Thêm state `showClaimHistory` để điều khiển modal
- Ô "Tổng Đã Tặng" (item cuối) thêm `onClick` mở modal
- Thêm hiệu ứng hover (cursor pointer đã có) + underline hoặc highlight để user biết có thể click
- Render `<ClaimHistoryModal>` khi state mở

### Kết quả
- Tiêu đề mặc định tiếng Anh: "HONOR BOARD"
- Ô cuối đổi thành "Total Gifted" / "Tổng Đã Tặng"
- Click vào ô đó → hiện bảng danh sách chi tiết tất cả user đã claim với đầy đủ thông tin

