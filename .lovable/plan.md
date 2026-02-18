
# Kế hoạch: Sửa lỗi tặng CAMLY hàng loạt & Mở khóa 2 tài khoản

## Phần 1: Mở khóa angelthanhthuy & susu

Cả hai tài khoản đang ở trạng thái `on_hold` với `approved_reward = 0`. Để cho phép claim, cần:
- Đặt `reward_status = 'approved'`
- Xóa `admin_notes` tạm giữ
- Không thay đổi `is_banned` (vẫn false — tài khoản bình thường, chỉ bị giữ reward)

Thực hiện bằng SQL update trực tiếp cho 2 user ID:
- angelthanhthuy: `f3d8831c-83b2-475a-a9ee-72d0f7d0c803`
- susu: `bfc87ada-bfce-4a5e-a185-4e4b246b1a50`

**Lưu ý:** Cả hai đều có `approved_reward = 0` và `display_name = null` — sau khi mở khoá, họ cần có đủ phần thưởng và điều kiện hồ sơ mới claim được. Có thể admin vẫn cần duyệt thêm.

## Phần 2: Sửa lỗi tặng CAMLY hàng loạt

### Root cause

Trong `handleSendMulti` (UnifiedGiftSendDialog.tsx, dòng 459-531):

```
for (let i = 0; i < recipientsWithWallet.length; i++) {
  resetState(); // ← VẤN ĐỀ 1: reset state wagmi ngay trước khi gọi sendToken
  const hash = await sendToken(...);
  ...
}
```

Vấn đề cụ thể:
1. **`resetState()` gọi trước mỗi vòng lặp** làm clear `txHash` và `txStep` khi wagmi hook đang xử lý giao dịch trước → gây conflict state
2. **Không có delay giữa các giao dịch** → nonce có thể bị trùng trên BSC nếu pending TX chưa confirm
3. **`isPending` (wagmiPending)** bị check ở `isSendDisabled` — khi đang trong vòng lặp multi, button vẫn có thể được bấm lại

### Giải pháp

**File: `src/components/donations/UnifiedGiftSendDialog.tsx`**

Sửa `handleSendMulti`:
- Bỏ `resetState()` khỏi đầu vòng lặp — chỉ reset sau khi nhận hash (hoặc lỗi)  
- Thêm delay nhỏ (300ms) giữa mỗi giao dịch để BSC có thời gian xử lý nonce
- Wrap mỗi `sendToken` call trong try/catch riêng biệt và cập nhật progress từng bước rõ ràng hơn

```typescript
// TRƯỚC (lỗi):
for (let i = 0; i < recipientsWithWallet.length; i++) {
  setMultiSendProgress(prev => prev ? { ...prev, current: i + 1 } : prev);
  try {
    resetState(); // ← XOÁ DÒNG NÀY
    const hash = await sendToken(...);
    ...
  }
}

// SAU (đúng):
for (let i = 0; i < recipientsWithWallet.length; i++) {
  setMultiSendProgress(prev => prev ? { ...prev, current: i + 1 } : prev);
  
  // Delay giữa các TX để tránh nonce conflict
  if (i > 0) await new Promise(r => setTimeout(r, 500));
  
  try {
    const hash = await sendToken(...); // sendToken tự quản lý state
    if (hash) {
      results.push({ recipient, success: true, txHash: hash });
      resetState(); // Reset SAU khi có hash thành công
    } else {
      results.push({ recipient, success: false, error: 'Giao dịch bị từ chối' });
      resetState();
    }
  } catch (err: any) {
    results.push({ recipient, success: false, error: err?.message || 'Lỗi gửi' });
    resetState();
  }
  ...
}
```

## Tóm tắt thay đổi

| Loại | Chi tiết |
|---|---|
| Database | Mở khóa 2 tài khoản: angelthanhthuy & susu (`reward_status = 'approved'`) |
| Code | Sửa `handleSendMulti` trong UnifiedGiftSendDialog.tsx — bỏ `resetState()` đầu vòng lặp, thêm delay 500ms |

## Ghi chú kỹ thuật

- Việc gọi `resetState()` ngay trước `sendToken` làm Wagmi hook mất track state của chính nó — đây là pattern sai vì `sendToken` bên trong đã tự gọi `setTxStep('signing')` ngay sau khi vào
- Delay 500ms giữa các TX là đủ để BSC node cập nhật nonce (BSC block time ~3 giây)
- Với cả hai tài khoản: sau khi mở khóa, nếu `approved_reward = 0` thì họ vẫn cần admin duyệt thêm phần thưởng mới rút được CAMLY
