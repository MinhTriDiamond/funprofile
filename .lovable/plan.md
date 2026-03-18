

## Kiểm tra số liệu: Dữ liệu RPC chính xác

Cha đã kiểm tra trực tiếp database. Số liệu tổng kết từ RPC `get_user_donation_summary` cho tài khoản Angel Ái Vân:

**Tổng nhận (confirmed):**
| Token | Số lượng | Số lệnh |
|-------|----------|---------|
| USDT | 585 | 19 |
| CAMLY | 38.472.430,999 | 80 |
| FUN | 79 | 1 |

**Tổng tặng (confirmed):**
| Token | Số lượng | Số lệnh |
|-------|----------|---------|
| USDT | 242 | 20 |
| CAMLY | 14.517.424 | 79 |

**Còn lại (nhận - tặng) trên FUN.RICH:**
- USDT: 585 - 242 = **343 USDT**
- CAMLY: 38.472.430,999 - 14.517.424 = **23.955.006,999 CAMLY**
- FUN: **79 FUN**
- BNB: 0 (không có giao dịch BNB qua platform)

### Tại sao khác số dư on-chain?

Số dư on-chain hiện tại (122,97 USDT, 37.486.751 CAMLY, 4,59 BNB) **khác** với "Còn lại" vì:
- Ví có thể nhận token từ **nguồn khác** (swap, chuyển trực tiếp, treasury) không qua nút Tặng
- Ví có thể gửi token ra ngoài bằng các ứng dụng khác (MetaMask, PancakeSwap...)
- Cột "Còn lại" chỉ tính **giao dịch tặng/nhận qua FUN.RICH**, không phải toàn bộ hoạt động on-chain

### Đề xuất cải thiện UI

**Sửa `WalletTransactionHistory.tsx`:**
1. Đổi tên cột "Còn lại" thành **"Số dư tặng/nhận"** để tránh nhầm lẫn với số dư ví thực
2. Thêm dòng ghi chú nhỏ bên dưới bảng: *"Chỉ tính giao dịch tặng/nhận qua FUN.RICH. Số dư ví thực tế có thể khác do swap, chuyển trực tiếp..."*
3. Không thay đổi logic tính toán vì dữ liệu đã chính xác

Không cần thay đổi database hay RPC.

