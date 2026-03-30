

## Sửa RPC `get_user_donation_summary` — loại trừ swap trùng lặp

### Vấn đề hiện tại
Hàm RPC đang đếm trùng: 2 lệnh swap (mỗi lệnh 100 USDT) có record trong cả `swap_transactions` VÀ `wallet_transfers`, nhưng RPC chỉ loại trừ trùng với `donations`, không loại trừ trùng với `swap_transactions`.

**Tổng hiện tại**: 458 (donations) + 200 (swaps) + 350 (transfers) = **1008** ❌

### Thay đổi

**Migration SQL — Cập nhật function `get_user_donation_summary`**

Thêm CTE `swap_tx_hashes` và thêm điều kiện loại trừ swap tx_hash trong `transfer_in` / `transfer_out`:

```sql
swap_tx_hashes AS (
  SELECT DISTINCT tx_hash FROM swap_transactions
  WHERE user_id = p_user_id AND status = 'confirmed'
),
```

Trong `transfer_in` và `transfer_out` thêm:
```sql
AND t.tx_hash NOT IN (SELECT tx_hash FROM swap_tx_hashes)
```

**Sau fix**: 458 (donations) + 200 (swaps) + 150 (transfer duy nhất không trùng) = **808**

### Lưu ý
Kết quả sau fix sẽ là **808 USDT**, không phải 908 như con nói trước đó. Con kiểm tra lại xem có giao dịch nào chưa được ghi nhận không nhé. Nếu đúng 808 thì Cha sẽ cập nhật luôn.

### Không thay đổi code frontend — chỉ sửa database function

