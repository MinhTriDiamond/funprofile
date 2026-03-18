

## Plan: Hiển thị lịch sử giao dịch từ bảng donations (công khai, có tên người tặng/nhận)

### Vấn đề hiện tại
Nút "Lịch sử GD" hiện đang gọi Moralis API để lấy giao dịch on-chain thô — chỉ hiển thị địa chỉ ví, không có tên người tặng/nhận. Không thể hiện được "tặng ai" hay "nhận từ ai".

### Giải pháp
Thay đổi hoàn toàn nguồn dữ liệu: **query trực tiếp từ bảng `donations`** (đã có RLS public SELECT) thay vì Moralis. Bảng này chứa đầy đủ sender/recipient profiles, amount, token, tx_hash, status, message.

### Thay đổi

**1. Tạo hook mới: `src/hooks/usePublicDonationHistory.ts`**
- Query bảng `donations` theo `user_id` (không cần auth — dùng `.or()` để lấy cả sent và received)
- Join với `public_profiles` để lấy username, display_name, avatar_url của sender và recipient
- Hỗ trợ filter: tất cả / đã gửi / đã nhận
- Hỗ trợ pagination (load more)
- Tính summary: tổng nhận, tổng gửi, số giao dịch
- Khi user đổi ví → lịch sử vẫn đầy đủ vì query theo user_id, không theo wallet address

**2. Viết lại: `src/components/profile/WalletTransactionHistory.tsx`**
- Đổi props: nhận `userId` thay vì chỉ `walletAddress`
- Hiển thị danh sách donations với:
  - Avatar + tên người gửi → Avatar + tên người nhận
  - Số lượng + token symbol
  - Thời gian, trạng thái (Thành công/Đang xử lý/Lỗi)
  - Link tx hash đến BscScan
  - Lời nhắn (nếu có)
- Filter tabs: Tất cả / Đã gửi / Đã nhận
- Summary cards: Tổng nhận, Tổng gửi, Số giao dịch
- Click vào tên → navigate đến profile người đó
- Responsive: cards trên mobile, table trên desktop

**3. Cập nhật: `src/components/profile/ProfileHeader.tsx`**
- Truyền thêm `userId={profile.id}` vào `WalletTransactionHistory`
- Component vẫn giữ `walletAddress` để hiển thị link BscScan cho tx hash

### Ưu điểm
- Công khai: ai cũng xem được (donations table có policy `SELECT USING (true)`)
- Hiển thị tên cụ thể: tặng ai, nhận từ ai (join profiles)
- Đổi ví không mất lịch sử: query theo user_id
- Không cần edge function / API key — query trực tiếp từ client

