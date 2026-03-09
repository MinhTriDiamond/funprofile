

## Vấn đề phát hiện

Hệ thống auto-scan đang ghi nhận **giao dịch spam/dust attack** từ BSC blockchain:

1. **Address Poisoning**: Scammer gửi ~0.000016 USDT từ địa chỉ giả mạo trông giống ví user thật (VD: `0x8004...6966` giả mạo giống ví `angelthutrang`). Đây **KHÔNG PHẢI** user Fun Profile.
2. **Zero-amount transfers**: 27 giao dịch có amount = 0 (ERC20 approval transactions)
3. **Tổng cộng 104 donations spam** (amount < 0.01 USDT) đang xuất hiện trong lịch sử

### Giải pháp

| Thay đổi | Mô tả |
|---|---|
| Sửa `auto-scan-donations` | Thêm bộ lọc minimum amount: ≥ 0.01 cho USDT/BTCB, ≥ 1 cho CAMLY/FUN. Bỏ qua giao dịch amount = 0. |
| Sửa `scan-my-incoming` | Thêm cùng bộ lọc minimum amount |
| Xóa dữ liệu spam | Xóa 104+ donations spam có amount < 0.01 và is_external = true. Xóa 27 donations có amount = 0. |
| Xóa posts spam | Xóa gift_celebration posts tương ứng với các donations spam |

### Chi tiết kỹ thuật

**Minimum amounts:**
```text
USDT, BTCB: ≥ 0.01
CAMLY: ≥ 1
FUN: ≥ 1
```

**Bộ lọc thêm vào edge functions:**
- Sau khi parse amount, kiểm tra `amount >= MIN_AMOUNT[tokenSymbol]`
- Nếu amount < threshold → bỏ qua, không insert

**Cleanup SQL:**
- `DELETE FROM posts WHERE post_type = 'gift_celebration' AND tx_hash IN (SELECT tx_hash FROM donations WHERE CAST(amount AS DECIMAL) < 0.01 AND is_external = true)`
- `DELETE FROM donations WHERE CAST(amount AS DECIMAL) < 0.01 AND is_external = true`
- `DELETE FROM donations WHERE amount = '0'`

