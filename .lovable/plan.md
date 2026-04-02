

## Hiển thị địa chỉ ví BTC trên trang Ví

### Vấn đề
Trang Ví hiện chỉ hiển thị địa chỉ EVM (MetaMask/Trust/Bitget). User muốn hiển thị thêm địa chỉ ví BTC (mạng Bitcoin gốc) đã lưu trong profile.

### Thay đổi

#### 1) `src/components/wallet/WalletCenterContainer.tsx`
- Mở rộng `fetchProfile` để lấy thêm `btc_address` từ bảng `profiles`
- Truyền `btcAddress` xuống `AssetTab`

#### 2) `src/components/wallet/tabs/AssetTab.tsx`
- Nhận thêm prop `btcAddress`
- Hiển thị một section nhỏ bên dưới WalletCard (hoặc trong WalletCard) cho BTC address:
  - Logo BTC (cam) + "Bitcoin Network"
  - Địa chỉ BTC rút gọn (6 ký tự đầu...4 ký tự cuối) + nút copy
  - Nếu chưa có btc_address → hiển thị nút "Thêm địa chỉ BTC" link đến EditProfile

#### 3) `src/components/wallet/WalletCard.tsx`
- Thêm section hiển thị BTC address bên dưới EVM address trong header, với:
  - Icon BTC nhỏ + địa chỉ rút gọn + nút copy
  - Badge "Bitcoin" để phân biệt với BSC

### Kết quả
- Trang Ví hiển thị cả địa chỉ EVM (BSC) và BTC (Bitcoin) của user
- User có thể copy địa chỉ BTC trực tiếp từ trang Ví
- Nếu chưa liên kết BTC → gợi ý đến trang chỉnh sửa profile

