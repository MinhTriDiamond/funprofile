

# Tạo Trang Mint FUN Money và Nút Mint Trên Navbar

## Tổng Quan

Tạo trang `/mint` riêng biệt (tham khảo angel.fun.rich/mint) và thêm nút "Mint" với logo GIF màu vàng trên thanh điều hướng, nằm bên phải icon Ví.

## Phần 1: Thêm Nút "Mint" Trên Navbar

### Desktop (FacebookNavbar)
- Thêm mục "Mint" vào danh sách `iconNavItems`, đặt ngay sau Wallet
- Sử dụng logo GIF được upload (copy vào `src/assets/tokens/fun-ecosystem-mint.gif`)
- Chữ "Mint" màu vàng gold trong tooltip
- Khi nhấn, điều hướng đến `/mint`

### Mobile (MobileBottomNav)
- Không thay đổi bottom nav (giữ nguyên 5 mục hiện tại)
- Trang `/mint` vẫn truy cập được từ trang Wallet hoặc qua URL trực tiếp

## Phần 2: Tạo Trang `/mint` Mới

Trang này tổng hợp các tính năng mint FUN Money vào một giao diện chuyên biệt, tham khảo từ angel.fun.rich/mint:

### Section 1: Header "Mint FUN Money"
- Badge "Proof of Pure Love Protocol" phía trên
- Tiêu đề "Mint FUN Money" màu cam/vàng
- Mô tả: "Claim FUN Money token (BEP-20) về ví của bạn từ các Light Actions đã được Angel AI xác nhận"

### Section 2: Thông Báo Quan Trọng
- Banner cảnh báo: "FUN Money đang chạy trên BSC Testnet. Bạn cần tBNB để trả phí gas."
- Link "Lấy tBNB miễn phí" dẫn đến faucet

### Section 3: Hướng Dẫn Activate & Claim (4 bước)
1. Kết nối ví MetaMask vào BSC Testnet (Chain ID: 97)
2. Kiểm tra mục "Token Lifecycle" - số Locked
3. Nhấn "Activate All" - chuyển Locked sang Activated
4. Nhấn "Claim All" - FUN chuyển về ví cá nhân

### Section 4: FUN Money On-Chain (2 cột trên desktop)
**Cột trái:**
- Card "FUN Money On-Chain" hiển thị địa chỉ ví, số dư, BSCScan link
- Trạng thái Locked / Activated (đã có `FunBalanceCard`)
- Token Lifecycle: Locked, Activated, Flowing
- Pipeline Progress bar
- Nút Activate & Claim
- Phần "Cách thức hoạt động" (5 bước)

**Cột phải:**
- Thống kê tổng quan: Chưa gửi / Đang chờ duyệt / Đã mint
- Danh sách "Light Actions của bạn" với nút "Làm mới"
- Mỗi action card hiển thị: loại hành động, thời gian, Light Score, 5 cột trụ (S/T/H/C/U), Reward, trạng thái

### Section 5: Trạng Thái Action Cards
- "Sẵn sàng mint" (badge xanh lá) - có nút claim
- "Đang chờ Admin phê duyệt" (badge vàng)
- "Đang xử lý..." (badge xám)
- "Đã nhận FUN" (badge xanh) - link "Xem trên BSCScan"
- "Đã mint on-chain" (badge xanh đậm)

## Chi Tiết Kỹ Thuật

### Files mới:
1. `src/pages/Mint.tsx` - Trang chính
2. `src/components/mint/MintHeader.tsx` - Header + hướng dẫn
3. `src/components/mint/MintGuide.tsx` - 4 bước hướng dẫn
4. `src/components/mint/LightActionCard.tsx` - Card hiển thị từng action
5. `src/components/mint/LightActionsList.tsx` - Danh sách actions với thống kê
6. `src/components/mint/MintOnChainPanel.tsx` - Panel bên trái (balance + lifecycle)
7. `src/components/mint/HowItWorks.tsx` - Phần cách thức hoạt động
8. Copy file GIF logo vào `src/assets/tokens/fun-ecosystem-mint.gif`

### Files sửa:
1. `src/App.tsx` - Thêm route `/mint`
2. `src/components/layout/FacebookNavbar.tsx` - Thêm nút Mint sau Wallet
3. `src/components/layout/MobileBottomNav.tsx` - Không thay đổi (giữ nguyên)

### Dữ liệu sử dụng:
- Hook `usePendingActions` - lấy tất cả light actions chờ claim
- Hook `useFunBalance` - lấy số dư on-chain (locked/activated)
- Hook `useLightScore` - lấy điểm Light Score và pillars
- Hook `useMintFun` - thực hiện mint
- Truy vấn `light_actions` với tất cả trạng thái (approved, pending, minted) để hiển thị lịch sử đầy đủ

### Navbar - Vị trí nút Mint:
```text
[Home] [Friends] [Reels] [Chat] [Wallet] [Mint] [Angel AI]
                                           ^^^^^
                                    Logo GIF + chữ vàng
```

### Trang Mint - Layout responsive:
```text
Desktop (lg+):
+-------------------------------------------+
|     Proof of Pure Love Protocol           |
|        Mint FUN Money                     |
|     (mô tả + cảnh báo BSC Testnet)       |
|     (4 bước hướng dẫn)                    |
+-------------------+-----------------------+
| FUN Money On-Chain| Light Actions của bạn |
| - Số dư           | - Thống kê           |
| - Lifecycle        | - Danh sách cards    |
| - Activate/Claim   | - Trạng thái         |
| - Cách hoạt động   |                      |
+-------------------+-----------------------+

Mobile:
Tất cả xếp theo 1 cột dọc
```

