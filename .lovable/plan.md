

# Kế Hoạch Sửa Lỗi "Không thể thực hiện giao dịch" (Donation)

## Nguyên Nhân Lỗi

Lỗi **`connection.connector.getChainId is not a function`** xảy ra do cách kết nối ví không đúng:

```typescript
// ❌ SAI - Tạo connector mới mỗi lần gọi
import { injected } from 'wagmi/connectors';
connect({ connector: injected() });
```

Vấn đề là dự án sử dụng **RainbowKit** để quản lý connectors, nhưng code đang tạo connector mới bằng `injected()` - không sync với hệ thống của RainbowKit, dẫn đến transaction bị lỗi.

---

## Giải Pháp

Sử dụng **`useConnectModal`** từ RainbowKit thay vì tự tạo connector:

```typescript
// ✅ ĐÚNG - Dùng RainbowKit modal
import { useConnectModal } from '@rainbow-me/rainbowkit';

const { openConnectModal } = useConnectModal();

const handleConnectWallet = () => {
  openConnectModal?.();
};
```

---

## Files Cần Sửa

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/components/donations/DonationDialog.tsx` | Thay `injected()` bằng `useConnectModal` |
| 2 | `src/components/admin/PplpMintTab.tsx` | Thay `injected()` bằng `useConnectModal` |

---

## Chi Tiết Thay Đổi

### 1. DonationDialog.tsx

**Trước:**
```typescript
import { injected } from 'wagmi/connectors';

const { connect, isPending: isConnecting } = useConnect();

const handleConnectWallet = () => {
  connect({ connector: injected() });
};
```

**Sau:**
```typescript
import { useConnectModal } from '@rainbow-me/rainbowkit';

const { openConnectModal } = useConnectModal();

const handleConnectWallet = () => {
  openConnectModal?.();
};
```

### 2. PplpMintTab.tsx

Tương tự - thay `injected()` bằng `useConnectModal`.

---

## Kết Quả Mong Đợi

1. Khi bấm "Kết nối" → Mở RainbowKit modal với tất cả ví đã config (MetaMask, Trust, Bitget, FUN Wallet)
2. Sau khi kết nối → Giao dịch transfer token hoạt động bình thường
3. Không còn lỗi `getChainId is not a function`

---

## Timeline

| Task | Thời gian |
|------|-----------|
| Sửa DonationDialog.tsx | 2 phút |
| Sửa PplpMintTab.tsx | 2 phút |
| Test giao dịch | 5 phút |
| **Tổng** | **~10 phút** |

