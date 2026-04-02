

# Sửa 3 vấn đề: Hiển thị BTC, QR code quét không được, logo BTC nhỏ

## Vấn đề phát hiện

1. **Hình 1 & 2**: Số dư BTC = 0 → "$0.000000" và "0.00000000 BTC" hiển thị đúng (số dư thật sự là 0). Không có lỗi ở đây — đây là dữ liệu chính xác.

2. **Hình 3 — QR code quét không được**: QR code trong `BtcWalletPanel` dùng `size={160}` (khá nhỏ) và `level="M"`. Cần tăng kích thước và error correction level để dễ quét hơn.

3. **Hình 4 — Logo BTC nhỏ hơn CAMLY**: Cả hai đều dùng `w-8 h-8` nhưng file `btc-logo.png` có thể có padding nội bộ. Cần tăng kích thước logo BTC trong danh sách token lên `w-10 h-10` để bù trừ.

## Thay đổi

### 1) Sửa QR code dễ quét hơn
**File:** `src/components/donations/gift-dialog/BtcWalletPanel.tsx` (dòng 67)

- Tăng `size` từ `160` → `220`
- Tăng `level` từ `"M"` → `"H"` (error correction cao nhất)
- Thêm `includeMargin={true}` để có viền trắng quanh QR

### 2) Tăng logo BTC trong danh sách token
**File:** `src/components/wallet/WalletCard.tsx` (dòng 258-261)

Thêm điều kiện: nếu `token.symbol === 'BTC'` thì dùng `w-10 h-10` thay vì `w-8 h-8`

### 3) Tăng logo BTC trong AssetTab
**File:** `src/components/wallet/tabs/AssetTab.tsx` (dòng 159, 279)

Tăng logo BTC từ `w-8 h-8` → `w-10 h-10` tại cả hai khung BTC (authenticated và guest view)

## Kết quả
- QR code lớn hơn, dễ quét hơn trên điện thoại
- Logo BTC cùng kích thước thị giác với CAMLY và các token khác

