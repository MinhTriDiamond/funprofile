
# Sửa Lỗi UI Kẹt "Đang Xử Lý" Khi Gửi USDT

## Nguyên Nhân Gốc

Hook `useSendToken` hiện tại sử dụng `sendTransactionAsync` từ wagmi. Hàm này trả về `txHash` **sau khi giao dịch đã được ký và broadcast**, nhưng có 2 điểm gây kẹt:

1. **Bước ghi DB (dòng 87-98)**: Sau khi có txHash, code gọi `supabase.auth.getUser()` rồi `supabase.from('transactions').insert(...)` — nếu session hết hạn hoặc mạng chậm, bước này treo vô thời hạn
2. **Không có timeout** cho bất kỳ bước async nào sau khi có txHash
3. **SendConfirmModal** hiển thị "Đang gửi..." dựa trên `isPending` nhưng không có trạng thái trung gian để user biết giao dịch đã thành công on-chain

## Giải Pháp

### 1. Thêm State Machine vào `useSendToken`

Thay vì chỉ có `isProcessing` (boolean), thêm trạng thái rõ ràng:

- `idle` — chưa làm gì
- `signing` — chờ user ký trong MetaMask
- `broadcasted` — đã có txHash, đang chờ confirm
- `confirming` — đang chờ receipt từ blockchain
- `finalizing` — ghi log DB
- `success` — hoàn tất
- `timeout` — chờ confirm quá lâu, cần kiểm tra lại

### 2. Thêm Receipt Polling + Timeout vào `useSendToken`

- Sau khi có txHash, dùng `publicClient.waitForTransactionReceipt` với timeout 60 giây
- Nếu timeout: UI vẫn chuyển thành công (vì giao dịch đã broadcast), hiện nút "Kiểm tra lại"
- Nếu receipt.status reverted: báo "Giao dịch không thành công (reverted)"

### 3. Bọc bước ghi DB bằng Timeout 8 giây

- Ghi log DB (insert vào bảng `transactions`) được bọc trong `Promise.race` với timeout 8 giây
- Nếu quá thời gian hoặc lỗi: UI vẫn báo thành công on-chain, hiện cảnh báo nhẹ "Chưa ghi nhận vào hệ thống, vui lòng tải lại"

### 4. Cập nhật `SendConfirmModal` hiển thị tiến trình

- Hiển thị các bước: Ký giao dịch → Đã broadcast → Đang xác nhận → Hoàn tất
- Ngay khi có txHash: hiện link "Xem trên BscScan"
- Nếu timeout: hiện nút "Kiểm tra lại"

### 5. Thêm debug logs tại các mốc quan trọng

- `[SEND] SIGN_REQUESTED`
- `[SEND] TX_HASH_RECEIVED: {hash}`
- `[SEND] WAIT_RECEIPT_START`
- `[SEND] RECEIPT_RECEIVED: {status}`
- `[SEND] DB_LOG_START`
- `[SEND] DB_LOG_DONE`
- `[SEND] FLOW_FINALLY`

### 6. Cập nhật thông báo theo Ngôn Ngữ Ánh Sáng

- User huỷ ký: "Bạn đã huỷ giao dịch"
- Không đủ BNB: "Cần thêm BNB để trả phí gas"
- Reverted: "Giao dịch chưa hoàn tất, vui lòng thử lại"
- RPC chậm: "Mạng đang bận, vui lòng thử lại sau"

## Chi Tiết Kỹ Thuật

### Danh sách files cần thay đổi

| File | Hành động |
|------|-----------|
| `src/hooks/useSendToken.ts` | **Viết lại** — thêm state machine, receipt polling, DB timeout, debug logs |
| `src/components/wallet/SendConfirmModal.tsx` | **Cập nhật** — hiển thị tiến trình theo step, link BscScan, nút "Kiểm tra lại" |
| `src/components/wallet/SendTab.tsx` | **Cập nhật** — nhận thêm state từ hook, truyền xuống modal |

### Flow mới trong `useSendToken`

```text
User bấm "Xác nhận gửi"
  |
  v
step = "signing"
  |  (sendTransactionAsync)
  v
step = "broadcasted"  -->  txHash có ngay  -->  UI hiện link BscScan
  |
  v
step = "confirming"
  |  (waitForTransactionReceipt, timeout 60s)
  |
  +-- Thành công --> step = "finalizing"
  |                    |  (DB insert, timeout 8s)
  |                    v
  |                  step = "success"  -->  reset form, toast thành công
  |
  +-- Timeout 60s --> step = "success" (vẫn thành công vì đã broadcast)
  |                    hiện cảnh báo: "Chưa nhận xác nhận kịp thời"
  |                    hiện nút "Kiểm tra lại"
  |
  +-- Reverted --> toast: "Giao dịch chưa hoàn tất"
```

### Cấu trúc return mới của `useSendToken`

```text
{
  sendToken,
  txStep: 'idle' | 'signing' | 'broadcasted' | 'confirming' | 'finalizing' | 'success' | 'timeout',
  txHash: string | null,
  isPending: boolean,
  recheckReceipt: () => Promise<void>   // nút "Kiểm tra lại"
}
```

### SendConfirmModal cập nhật

- Props mới: `txStep`, `txHash`, `onRecheck`
- Khi `txStep = 'signing'`: "Vui lòng xác nhận trong ví..."
- Khi `txStep = 'broadcasted' | 'confirming'`: Hiện thanh tiến trình + link BscScan
- Khi `txStep = 'success'`: Hiện thông báo thành công, auto đóng sau 3 giây
- Khi `txStep = 'timeout'`: Hiện link BscScan + nút "Kiểm tra lại"
