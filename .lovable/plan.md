
# Sửa lỗi mục Tặng quà hiển thị sai ví (402 thay vì afaa)

## Nguyên nhân

Người dùng có **2 tài khoản** trong MetaMask và đã chọn tài khoản `0xb4dd...afaa` qua tính năng Account Selector trên trang Ví. Tuy nhiên, dialog Tặng quà (`UnifiedGiftSendDialog`) dùng `useAccount()` từ wagmi (dòng 94), trả về địa chỉ mặc định của provider (`0x5102Ec...58a402`) -- **không phải** tài khoản người dùng đã chọn.

Trong khi đó, `useSendToken` đã xử lý đúng bằng cách dùng `useActiveAccount().activeAddress` làm ưu tiên (dòng 75: `const senderAddress = activeAddress || providerAddress`). Nhưng phần hiển thị trong dialog lại dùng `address` từ wagmi nên bị lệch.

## Giải pháp

Trong file `src/components/donations/UnifiedGiftSendDialog.tsx`:

1. **Import `useActiveAccount`** từ ActiveAccountContext
2. **Lấy `activeAddress`** và sử dụng nó thay cho `address` ở những chỗ hiển thị:
   - Dòng 94: Thêm `const { activeAddress } = useActiveAccount();`
   - Tạo biến `const effectiveAddress = activeAddress || address;`
   - Thay tất cả chỗ hiển thị `address` bằng `effectiveAddress` (dòng 666-668 hiển thị ví sender, dòng 677-679 kiểm tra mismatch)
   - Giữ nguyên `isConnected` từ `useAccount()` vì logic kết nối vẫn cần wagmi

## Chi tiết kỹ thuật

### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

**Dòng 1-30 (imports):** Thêm import:
```typescript
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
```

**Dòng 94:** Thêm activeAddress và tạo effectiveAddress:
```typescript
const { address, isConnected } = useAccount();
const { activeAddress } = useActiveAccount();
const effectiveAddress = activeAddress || address;
```

**Dòng 666-668 (hiển thị ví sender):** Đổi `address` thành `effectiveAddress`:
```typescript
{effectiveAddress && (
  <div className="flex items-center gap-1">
    <p className="...">{effectiveAddress.slice(0, 8)}...{effectiveAddress.slice(-6)}</p>
    <button onClick={() => handleCopyAddress(effectiveAddress)}>...</button>
  </div>
)}
```

**Dòng 677-679 (kiểm tra mismatch):** Đổi `address` thành `effectiveAddress`

**Dòng 144 (useEffect dependency):** Đổi `address` thành `effectiveAddress` để refetch sender profile khi user chọn account khác

Tất cả các chỗ sử dụng `address` trong phần **hiển thị** và **kiểm tra** sẽ chuyển sang `effectiveAddress`, đảm bảo đồng bộ với tài khoản người dùng đã chọn trên trang Ví.

## Kết quả mong đợi
- Khi người dùng chọn tài khoản `0xb4dd...afaa` trên trang Ví, dialog Tặng quà cũng hiển thị đúng `0xb4dd...afaa`
- Giao dịch gửi từ đúng tài khoản đã chọn (useSendToken đã xử lý đúng rồi)
