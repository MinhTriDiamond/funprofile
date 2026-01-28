
# Kế Hoạch Cải Thiện Kết Nối Ví: Hỗ Trợ MetaMask, Bitget và Trust Wallet

## Phân Tích Hiện Trạng

### Cấu Hình Hiện Tại
- **RainbowKit đã cấu hình**: MetaMask, Trust Wallet, Bitget Wallet trong `src/config/web3.ts`
- **F.U. Wallet (Custodial)**: Hoạt động đúng, địa chỉ `0x2e11...f6bd` là ví custodial tự động tạo
- **Vấn đề**: UI chỉ hiển thị "Connect MetaMask", không cho phép chọn ví khác

### Giải Pháp
Sử dụng RainbowKit's **ConnectButton** hoặc **useConnectModal** để hiển thị modal chọn ví, cho phép user chọn giữa MetaMask, Bitget, Trust Wallet.

## Chi Tiết Triển Khai

### Phần 1: Thêm Logo Ví Bitget và Trust Wallet

**Tải thêm logo:**
- `src/assets/bitget-logo.png` - Logo Bitget Wallet
- `src/assets/trust-wallet-logo.png` - Logo Trust Wallet

### Phần 2: Sử Dụng RainbowKit Modal

Thay đổi `handleConnect()` để sử dụng RainbowKit's `useConnectModal`:

```typescript
import { useConnectModal } from '@rainbow-me/rainbowkit';

const { openConnectModal } = useConnectModal();

const handleConnect = () => {
  if (openConnectModal) {
    openConnectModal(); // Mở modal RainbowKit với đầy đủ các ví
  }
};
```

### Phần 3: Cập Nhật UI Hiển Thị

**Thay đổi nút Connect:**
```text
Trước: [Connect MetaMask] - chỉ MetaMask
Sau:   [Connect Wallet] - mở modal với MetaMask, Bitget, Trust Wallet
```

**Cập nhật Wallet Type Badge:**
- Hiển thị đúng logo ví đang kết nối (MetaMask/Bitget/Trust)
- Sử dụng `connector.name` từ wagmi để xác định loại ví

### Phần 4: Cập Nhật Function Link Wallet

Thay vì dùng `window.ethereum.request()`, sử dụng wagmi's `useSignMessage` hook để hỗ trợ tất cả các ví:

```typescript
import { useSignMessage } from 'wagmi';

const { signMessageAsync } = useSignMessage();

const linkWalletToProfile = async () => {
  const signature = await signMessageAsync({ 
    message: `Xác nhận liên kết ví ${address}...`
  });
  // ... rest of logic
};
```

## Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE | Sử dụng RainbowKit modal, cập nhật UI |
| `src/assets/bitget-logo.webp` | CREATE | Logo Bitget Wallet |
| `src/assets/trust-wallet-logo.webp` | CREATE | Logo Trust Wallet |

## Thay Đổi Chi Tiết trong WalletCenterContainer.tsx

### 1. Import thêm hooks từ RainbowKit

```typescript
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useSignMessage, useAccount } from 'wagmi';
```

### 2. Lấy thông tin connector

```typescript
const { connector } = useAccount();

// Xác định loại ví đang kết nối
const connectedWalletType = useMemo(() => {
  if (!connector) return null;
  const name = connector.name.toLowerCase();
  if (name.includes('metamask')) return 'metamask';
  if (name.includes('bitget')) return 'bitget';
  if (name.includes('trust')) return 'trust';
  return 'other';
}, [connector]);
```

### 3. Cập nhật handleConnect()

```typescript
const { openConnectModal } = useConnectModal();

const handleConnect = useCallback(() => {
  localStorage.removeItem(WALLET_DISCONNECTED_KEY);
  setShowDisconnectedUI(false);
  
  if (openConnectModal) {
    openConnectModal();
  }
}, [openConnectModal]);
```

### 4. Cập nhật linkWalletToProfile() với useSignMessage

```typescript
const { signMessageAsync } = useSignMessage();

const linkWalletToProfile = useCallback(async () => {
  if (!address || !isConnected) return;
  
  const message = `Xác nhận liên kết ví ${address}...`;
  
  try {
    const signature = await signMessageAsync({ message });
    
    const { data, error } = await supabase.functions.invoke('connect-external-wallet', {
      body: { wallet_address: address, signature, message }
    });
    // ...
  } catch (err) {
    // Handle error
  }
}, [address, isConnected, signMessageAsync]);
```

### 5. Cập nhật UI Badge với dynamic wallet info

```typescript
// Trong Wallet Type Badge section
{activeWalletType === 'external' && (
  <>
    {connectedWalletType === 'metamask' && <img src={metamaskLogo} ... />}
    {connectedWalletType === 'bitget' && <img src={bitgetLogo} ... />}
    {connectedWalletType === 'trust' && <img src={trustLogo} ... />}
    <span>{connector?.name || 'External'} (External)</span>
  </>
)}
```

### 6. Cập nhật nút Connect trong UI

```typescript
// Thay thế nút "Connect MetaMask" bằng "Connect Wallet"
<Button onClick={handleConnect}>
  <Wallet className="w-4 h-4 mr-1" />
  Connect Wallet
</Button>
```

## User Flow Sau Khi Sửa

```text
1. User vào /wallet, thấy F.U. Wallet (Custodial)
2. Nhấn "Connect Wallet"
3. RainbowKit modal hiện lên với các lựa chọn:
   ├─ MetaMask
   ├─ Trust Wallet
   └─ Bitget Wallet
4. User chọn ví muốn kết nối (VD: Bitget)
5. Ví được kết nối, hiển thị badge "Bitget Wallet (External)"
6. User có thể "Liên kết với Profile" để lưu vào database
7. Có thể switch giữa F.U. Wallet và External Wallet
```

## Ghi Chú Quan Trọng

**F.U. Wallet (Custodial) - `0x2e11...f6bd`:**
- Đây là ví được hệ thống tạo tự động cho bạn
- KHÔNG THỂ xóa hoặc thay đổi
- Private key được mã hóa và lưu an toàn trong database
- Luôn available ngay cả khi không có MetaMask/Bitget

**External Wallet (MetaMask/Bitget/Trust):**
- Ví cá nhân của bạn, do bạn quản lý
- Có thể liên kết/hủy liên kết tùy ý
- Cần ký message để xác minh quyền sở hữu khi liên kết
