
# Kế Hoạch: Sửa Lỗi Giao Dịch Không Ghi Nhận Vào Hệ Thống

## Vấn Đề Xác Định

Giao dịch TX `0x64677ce959...` (9,999 CAMLY từ Minh Trí → NgocGiauMoney):
- ✅ Đã xác nhận thành công trên blockchain (MetaMask báo success)
- ❌ Không được ghi nhận trong database FUN Profile
- ❌ Không có logs của edge function `record-donation`
- ❌ UI bị kẹt ở trạng thái "Đang xử lý..." / "Đang xác nhận giao dịch..."

## Nguyên Nhân Root Cause

Phân tích luồng code trong `useDonation.ts`:

```text
┌──────────────────────────────────────────────────────────────────┐
│  1. sendTransactionAsync() → MetaMask confirm → TX on chain ✅   │
│     (Thành công - có hash 0x64677ce959...)                        │
├──────────────────────────────────────────────────────────────────┤
│  2. toast.loading("Đang xác nhận...")                             │
├──────────────────────────────────────────────────────────────────┤
│  3. supabase.auth.getSession() ← Có thể FAIL tại đây ⚠️          │
│     - Session expired                                             │
│     - Network issue                                               │
│     → throw new Error('Vui lòng đăng nhập')                       │
├──────────────────────────────────────────────────────────────────┤
│  4. supabase.functions.invoke('record-donation') ← KHÔNG chạy ❌  │
│     → Không có logs trong analytics                               │
├──────────────────────────────────────────────────────────────────┤
│  5. catch (error) → toast.error()                                 │
│     NHƯNG! toast.loading vẫn đang chạy với id 'donation-tx'       │
│     → UI hiển thị loading vô hạn                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Lỗi chính:** 
1. Nếu getSession() fail sau khi TX đã on-chain → giao dịch mất mà không thể phục hồi
2. Toast loading không được clear trong trường hợp error
3. Không có cơ chế retry khi edge function fail

## Giải Pháp

### 1. Thêm Recovery Mechanism cho Giao Dịch Đã Gửi

Lưu thông tin giao dịch vào localStorage ngay sau khi TX được confirm trên chain, trước khi gọi edge function. Nếu edge function fail, user có thể retry.

### 2. Sửa Lỗi Toast Loading Bị Kẹt

Đảm bảo toast.dismiss() được gọi trong mọi trường hợp error.

### 3. Thêm Retry Logic

Nếu edge function fail, hiển thị nút Retry thay vì để loading vô hạn.

### 4. Insert Thủ Công Giao Dịch Bị Mất

Tạo query SQL để Admin có thể insert thủ công giao dịch đã on-chain nhưng không được ghi nhận.

## Chi Tiết Kỹ Thuật

### File: `src/hooks/useDonation.ts`

```typescript
// TRƯỚC khi gọi edge function, lưu pending donation
const pendingDonation = {
  txHash,
  recipientId: params.recipientId,
  amount: params.amount,
  tokenSymbol: params.tokenSymbol,
  timestamp: Date.now(),
};
localStorage.setItem(`pending_donation_${txHash}`, JSON.stringify(pendingDonation));

// SAU khi edge function thành công, xóa pending
localStorage.removeItem(`pending_donation_${txHash}`);

// TRONG catch block, giữ lại pending để retry
// Và dismiss loading toast
toast.dismiss('donation-tx');
toast.error(errorMessage);
```

### File: `src/hooks/useDonation.ts` - Sửa Error Handling

```typescript
} catch (error: any) {
  console.error('Donation error:', error);
  
  // QUAN TRỌNG: Dismiss loading toast
  toast.dismiss('donation-tx');
  
  // Kiểm tra nếu TX đã gửi thành công nhưng recording fail
  if (txHash) {
    toast.error('Giao dịch thành công trên blockchain nhưng chưa ghi nhận. Vui lòng liên hệ Admin với TX: ' + txHash.slice(0, 10) + '...');
    // Có thể show button để copy TX hash
  } else {
    let errorMessage = 'Không thể thực hiện giao dịch';
    if (error.message?.includes('rejected')) {
      errorMessage = 'Giao dịch đã bị từ chối';
    } else if (error.message?.includes('insufficient')) {
      errorMessage = 'Số dư không đủ';
    }
    toast.error(errorMessage);
  }
  
  options?.onError?.(error);
  return null;
}
```

### Khôi Phục Giao Dịch Bị Mất

Cha sẽ tạo script SQL để Admin insert giao dịch thủ công:

```sql
-- Thêm giao dịch bị mất vào database
INSERT INTO donations (
  sender_id, recipient_id, amount, token_symbol, 
  token_address, chain_id, tx_hash, message, 
  message_template, status, light_score_earned, confirmed_at
) VALUES (
  '9a380ce8-6fdd-43a6-abf0-36690a7505c5', -- Minh Trí
  'ce344e2f-76fb-4ea6-bccb-68c9c1765b80', -- NgocGiauMoney
  '9999',
  'CAMLY',
  '0x0910320181889feFDE0BB1Ca63962b0A8882e413',
  56, -- BSC Mainnet
  '0x64677ce959709613428da46c21516716a90815a7c3e353e6e731760cd40b0daf',
  '🙏 Cảm ơn bạn rất nhiều!', -- Từ screenshot
  'grateful',
  'confirmed',
  99, -- 9999/100 = 99 Light Score
  NOW()
);
```

## Tổng Kết Files Cần Sửa

| File | Hành động |
|------|-----------|
| `src/hooks/useDonation.ts` | Sửa error handling, thêm recovery mechanism |
| Database | Insert thủ công giao dịch bị mất |

## Kết Quả Mong Đợi

1. ✅ Giao dịch `0x64677ce959...` được khôi phục vào database
2. ✅ Toast loading không còn bị kẹt vô hạn
3. ✅ Nếu edge function fail sau khi TX on-chain, user được thông báo rõ ràng với TX hash
4. ✅ Có cơ chế recovery cho các giao dịch bị mất trong tương lai
