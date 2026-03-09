

## Khắc phục tính năng tặng tiền hàng loạt không ghi nhận

### Nguyên nhân gốc

Sau khi phân tích code, có **3 vấn đề chính**:

1. **`recordMultiDonationsSequential` chạy fire-and-forget (không `await`)**: Sau khi multi-send xong, hàm ghi nhận donation được gọi mà không chờ kết quả (line 360). Nếu user đóng dialog hoặc navigate đi, quá trình ghi nhận bị gián đoạn.

2. **Không có delay giữa các lần gọi edge function**: Các lần gọi `record-donation` chạy liên tục không nghỉ, có thể gây timeout hoặc race condition khi tạo conversation/message cho cùng sender.

3. **Cache invalidation chỉ chạy 1 lần cuối**: Nếu quá trình recording mất thời gian, user đã nhìn thấy dữ liệu cũ rồi.

### Giải pháp

| File | Thay đổi |
|---|---|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | (1) `await recordMultiDonationsSequential` thay vì fire-and-forget. (2) Thêm delay 1.5s giữa mỗi lần gọi edge function. (3) Invalidate cache sau MỖI record thành công. (4) Hiển thị trạng thái "Đang ghi nhận X/Y..." trên celebration modal |
| `src/components/donations/gift-dialog/useDonationFlow.ts` | Cùng fixes cho hook version: delay giữa calls, invalidate per-record, thêm log chi tiết |

### Chi tiết kỹ thuật

**1. Await recording + hiển thị progress:**
```typescript
// Thay vì fire-and-forget:
recordMultiDonationsSequential(successResults);

// Sửa thành:
await recordMultiDonationsSequential(successResults);
```

**2. Delay + per-record invalidation trong `recordMultiDonationsSequential`:**
```typescript
for (const result of successResults) {
  if (result.txHash) {
    const ok = await recordDonationWithRetry(result.txHash, result.recipient, session);
    if (ok) {
      recorded++;
      invalidateDonationCache(); // Invalidate sau MỖI record
    }
    // Delay 1.5s giữa mỗi lần gọi để tránh race condition
    if (i < successResults.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}
```

**3. Snapshot giá trị vào biến local** trước khi gọi async để tránh closure bị stale:
```typescript
const snapshotAmount = amount;
const snapshotToken = selectedToken.symbol;
const snapshotMessage = customMessage;
// Dùng snapshot trong body thay vì closure reference
```

