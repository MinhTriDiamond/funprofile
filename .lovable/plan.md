

# Sửa hiển thị số dư BTC và tăng kích cỡ logo BTC

## Phân tích vấn đề

### 1. Số dư BTC hiện "0" (Hình 1 vs Hình 2)
Ứng dụng đang lấy số dư BTC chính xác từ Mempool.space cho địa chỉ `bc1qej50...x0gfc7`. Địa chỉ này thật sự có số dư = 0.

**Trong khi đó**, ví Bitget (Hình 2) hiển thị 0.00024859 BTC — nhưng đây là từ một **địa chỉ BTC khác** bên trong ví Bitget. Ví HD (Hierarchical Deterministic) có thể tạo nhiều địa chỉ BTC khác nhau — địa chỉ đã lưu trong hồ sơ không phải là địa chỉ chứa tiền.

**Giải pháp**: Con cần cập nhật địa chỉ BTC trong hồ sơ (Chỉnh sửa hồ sơ → Địa chỉ BTC) sang đúng địa chỉ có số dư trong ví Bitget. Để tìm đúng địa chỉ: mở Bitget → Bitcoin → Receive → copy địa chỉ đó và dán vào hồ sơ.

**Không cần sửa code** — đây là vấn đề dữ liệu, không phải lỗi kỹ thuật.

### 2. Tăng kích cỡ logo BTC gấp đôi (Hình 3 & 4)
Hiện tại logo BTC có các kích thước: `w-10 h-10`, `w-7 h-7`, `w-6 h-6`, `w-4 h-4` ở nhiều nơi. Cần tăng gấp đôi tất cả.

## Thay đổi code — Tăng kích cỡ logo BTC

### File 1: `src/components/wallet/tabs/AssetTab.tsx`
| Dòng | Hiện tại | Sau sửa |
|------|----------|---------|
| 107, 228 | `w-7 h-7` (header BTC card) | `w-14 h-14` |
| 159, 279 | `w-10 h-10` (balance row) | `w-14 h-14` |

### File 2: `src/pages/Profile.tsx`
| Dòng | Hiện tại | Sau sửa |
|------|----------|---------|
| 300 | `w-6 h-6` | `w-12 h-12` |

### File 3: `src/components/profile/ProfileHeader.tsx`
| Dòng | Hiện tại | Sau sửa |
|------|----------|---------|
| 192 | `w-4 h-4` | `w-8 h-8` |
| 198 | `w-4 h-4` | `w-8 h-8` |

### File 4: `src/components/wallet/BtcSendDialog.tsx`
| Dòng | Hiện tại | Sau sửa |
|------|----------|---------|
| 61 | `w-6 h-6` | `w-12 h-12` |

### File 5: `src/components/wallet/WalletCenterContainer.tsx`
| Dòng | Hiện tại | Sau sửa |
|------|----------|---------|
| 493 | `w-4 h-4` (dropdown) | `w-8 h-8` |

### File 6: `src/components/donations/NetworkSelector.tsx`
Tìm logo BTC và tăng gấp đôi kích thước.

## Kết quả
- Logo BTC to gấp đôi ở tất cả các trang
- Số dư BTC: con cần cập nhật đúng địa chỉ BTC trong hồ sơ (địa chỉ hiện tại có số dư = 0 trên blockchain)

