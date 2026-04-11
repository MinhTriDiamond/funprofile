

## Kế hoạch: Đồng bộ luồng gửi BTC trên điện thoại giống máy tính

### Phân tích hiện trạng

Luồng gửi BTC hiện tại đã **gần như giống nhau** giữa mobile và desktop. Cả hai đều hiển thị `BtcWalletPanel` với QR code, địa chỉ nhận, số lượng, nút "Mở ví BTC" và "Copy link". Tuy nhiên có **2 điểm khác biệt** cần sửa:

1. **Địa chỉ ví bị ẩn trên mobile**: Cả sender và recipient address đều dùng `hidden sm:flex` → trên điện thoại không thấy địa chỉ ví (trong khi desktop thấy rõ như hình)
2. **Thiếu hướng dẫn tương thích ví**: MetaMask hỗ trợ BTC native trên extension desktop nhưng trên mobile app có thể không xử lý `bitcoin:` URI — cần thêm ghi chú hướng dẫn

### Các thay đổi

#### File: `src/components/donations/gift-dialog/GiftConfirmStep.tsx`

**1. Hiện địa chỉ ví sender trên mobile**
- Dòng 93: Đổi `hidden sm:flex` → `flex` để địa chỉ ví người gửi hiển thị trên cả mobile
- Thêm `break-all` cho địa chỉ dài không bị tràn

**2. Hiện địa chỉ ví recipient trên mobile**  
- Dòng 284 (SingleRecipientDisplay): Đổi `hidden sm:flex` → `flex` tương tự

#### File: `src/components/donations/gift-dialog/BtcWalletPanel.tsx`

**3. Thêm hướng dẫn tương thích ví trên mobile**
- Thêm note nhỏ bên dưới nút "Mở ví BTC": 
  - "✅ Trust Wallet, Bitget Wallet: Hỗ trợ BTC native"
  - "⚠️ MetaMask: Chỉ hỗ trợ BTC trên extension desktop. Trên mobile, hãy dùng BTCB (BSC)"
- Note này chỉ hiện trên mobile (`sm:hidden`)

**4. Đảm bảo địa chỉ nhận hiển thị đầy đủ trên mobile**
- Đổi `truncate` → `break-all` cho địa chỉ nhận (dòng 80) để hiện toàn bộ giống desktop

### Tóm tắt
Chỉ sửa 2 file, không thay đổi logic giao dịch — chỉ cải thiện UI để mobile hiển thị đầy đủ thông tin giống desktop.

| File | Thay đổi |
|------|----------|
| `GiftConfirmStep.tsx` | Bỏ `hidden` cho địa chỉ ví sender/recipient trên mobile |
| `BtcWalletPanel.tsx` | Thêm ghi chú tương thích ví, hiện full địa chỉ |

