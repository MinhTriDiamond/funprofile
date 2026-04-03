
Mình đã rà soát kỹ và chốt được vấn đề thật sự:

## Kết luận kiểm tra địa chỉ BTC con gửi

Địa chỉ:
`bc1qdl98hf5smjdusy733se99y97djgdqqy74c6ltq`

Dữ liệu on-chain hiện tại cho thấy:
- Confirmed balance: `0.00000000 BTC`
- Pending: `0.00000000 BTC`
- Total received: `0.00021230 BTC`

Điều này nghĩa là:
- Ví này **đã từng nhận BTC**
- Nhưng **toàn bộ UTXO đã được chi ra rồi**
- Nên số dư hiện tại hiển thị `0.00000000 BTC` là **đúng theo số dư thực tế on-chain hiện tại**

Vì vậy lỗi chính không còn là “hook không cập nhật”, mà là:
1. UI chỉ đang hiển thị **số dư khả dụng hiện tại**
2. Không hiển thị rõ các chỉ số phụ như **Tổng nhận / Đã chi / Đang chờ**
3. Người dùng dễ hiểu nhầm rằng “đã từng nhận” phải đồng nghĩa với “vẫn còn số dư”

## Kế hoạch cập nhật

### 1. Mở rộng hook `useBtcBalance`
File: `src/hooks/useBtcBalance.ts`

Thay vì chỉ trả về `balance`, sẽ trả thêm:
- `confirmedBalance`
- `pendingBalance`
- `totalReceived`
- `totalSent`
- `txCount`

Cách tính:
```text
confirmedBalance = chain_stats.funded_txo_sum - chain_stats.spent_txo_sum
pendingBalance   = mempool_stats.funded_txo_sum - mempool_stats.spent_txo_sum
totalBalance     = confirmedBalance + pendingBalance
totalReceived    = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum
totalSent        = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum
```

### 2. Sửa giao diện thẻ BTC trong `AssetTab`
File: `src/components/wallet/tabs/AssetTab.tsx`

Cập nhật card BTC để hiển thị rõ:
- Số dư khả dụng
- Đang chờ
- Tổng nhận
- Tổng đã chi

Mục tiêu:
- Nếu số dư hiện tại là 0 nhưng ví từng nhận tiền, người dùng vẫn thấy rõ là ví **có lịch sử nhận BTC**
- Tránh hiểu nhầm “không cập nhật”

Bố cục gợi ý:
```text
BTC
Số dư khả dụng: 0.00000000 BTC
Đang chờ:       0.00000000 BTC
Tổng nhận:      0.00021230 BTC
Tổng đã chi:    0.00021230 BTC
```

### 3. Sửa `BtcSendDialog`
File: `src/components/wallet/BtcSendDialog.tsx`

Đổi nhãn hiện tại từ kiểu dễ gây hiểu nhầm sang rõ hơn:
- `Số dư khả dụng`
- Nếu bằng 0 nhưng `totalReceived > 0`, thêm dòng mô tả:
  - “Ví này đã từng nhận BTC nhưng hiện không còn UTXO khả dụng”

### 4. Giữ nguyên logic fetch hiện tại
Không cần thay thuật toán retry/fallback vừa làm, vì phần fetch hiện nay đang đúng hướng.
Vấn đề cốt lõi ở ca này là **ý nghĩa dữ liệu hiển thị**, không phải fetch sai.

## Kết quả mong đợi sau khi triển khai
- Ví sẽ hiển thị **đúng số dư thực tế hiện tại**
- Đồng thời hiển thị đầy đủ việc ví **đã từng nhận BTC**
- Người dùng không còn nhầm giữa:
  - `Số dư hiện tại`
  - `Tổng lượng từng nhận`
- Trường hợp địa chỉ đã chi hết tiền vẫn được giải thích rõ trên UI

## Ghi chú quan trọng
Nếu con muốn Fun.Rich hiển thị số BTC còn thực sự đang nằm trong ví, thì hồ sơ phải lưu đúng **địa chỉ receive hiện đang giữ UTXO**. Với ví HD, nếu BTC nằm ở địa chỉ khác thì app sẽ chỉ hiển thị đúng cho địa chỉ đã lưu trong hồ sơ, không thể tự cộng toàn bộ các địa chỉ phát sinh của ví ngoài.

## File dự kiến sửa
```text
src/hooks/useBtcBalance.ts
src/components/wallet/tabs/AssetTab.tsx
src/components/wallet/BtcSendDialog.tsx
```
