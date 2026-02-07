

# Kế Hoạch Thêm Nút Chuyển Mạng BSC Testnet

## Mục Tiêu

Thêm tính năng cho phép người dùng chuyển đổi giữa **BSC Mainnet** và **BSC Testnet** ngay trong trang `/wallet`, phục vụ cho việc test PPLP Minting trên Testnet.

## Thiết Kế UI

Thay thế badge tĩnh "BNB Smart Chain" hiện tại bằng một **Network Selector** có khả năng chuyển đổi:

```text
┌─────────────────────────────────────────────────────────────┐
│  My Wallet                     [🔗 BNB Mainnet ▼]           │
│  @username                                                  │
└─────────────────────────────────────────────────────────────┘
                                       ↓ Click để mở dropdown
                              ┌─────────────────────────┐
                              │ ✓ BNB Mainnet (56)      │
                              │   BNB Testnet (97)      │
                              └─────────────────────────┘
```

**Hiển thị động:**
- Badge thay đổi màu theo network đang kết nối
- Mainnet: Màu vàng (như hiện tại)
- Testnet: Màu cam/xanh để dễ phân biệt
- Hiển thị cảnh báo nếu đang ở Testnet

## Chi Tiết Kỹ Thuật

### File cần sửa: `src/components/wallet/WalletCenterContainer.tsx`

#### 1. Thêm state và import

```typescript
// Import thêm bscTestnet
import { bsc, bscTestnet } from 'wagmi/chains';

// Import DropdownMenu component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icon
import { ChevronDown, CheckCircle2 } from 'lucide-react';
```

#### 2. Thêm handler chuyển mạng

```typescript
// Handler switch to Testnet
const handleSwitchToTestnet = useCallback(() => {
  switchChain(
    { chainId: bscTestnet.id },
    {
      onSuccess: () => toast.success('Đã chuyển sang BSC Testnet'),
      onError: () => toast.error('Không thể chuyển network. Vui lòng thử lại.'),
    }
  );
}, [switchChain]);

// Handler switch to Mainnet
const handleSwitchToMainnet = useCallback(() => {
  switchChain(
    { chainId: bsc.id },
    {
      onSuccess: () => toast.success('Đã chuyển sang BSC Mainnet'),
      onError: () => toast.error('Không thể chuyển network. Vui lòng thử lại.'),
    }
  );
}, [switchChain]);
```

#### 3. Network config

```typescript
// Network configuration
const networkConfig = useMemo(() => {
  if (chainId === bscTestnet.id) {
    return {
      name: 'BSC Testnet',
      color: 'bg-orange-100 border-orange-300 text-orange-700',
      isTestnet: true,
    };
  }
  return {
    name: 'BNB Mainnet',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    isTestnet: false,
  };
}, [chainId]);
```

#### 4. Thay thế badge tĩnh bằng Network Selector

```tsx
{/* Network Selector Dropdown */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${networkConfig.color} hover:opacity-80 transition-opacity`}>
      <img src={bnbLogo} alt="BNB" className="w-5 h-5" />
      <span className="text-sm font-medium">{networkConfig.name}</span>
      <ChevronDown className="w-4 h-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem 
      onClick={handleSwitchToMainnet}
      className="flex items-center justify-between"
    >
      <span>BNB Mainnet (56)</span>
      {chainId === bsc.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
    </DropdownMenuItem>
    <DropdownMenuItem 
      onClick={handleSwitchToTestnet}
      className="flex items-center justify-between"
    >
      <span>BSC Testnet (97)</span>
      {chainId === bscTestnet.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 5. Thêm cảnh báo Testnet (optional)

```tsx
{/* Testnet Warning Banner */}
{chainId === bscTestnet.id && (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
    <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
    <span className="text-sm text-orange-700">
      Bạn đang ở BSC Testnet. Các giao dịch không dùng tiền thật.
    </span>
  </div>
)}
```

#### 6. Loại bỏ auto-switch sang Mainnet

Hiện tại có useEffect tự động switch sang BSC Mainnet - cần sửa để không bắt buộc:

```typescript
// TRƯỚC: Tự động switch về Mainnet
useEffect(() => {
  if (isConnected && chainId && chainId !== bsc.id) {
    switchChain({ chainId: bsc.id }, ...);
  }
}, [isConnected, chainId]);

// SAU: Chỉ hiển thị thông báo, không tự động switch
useEffect(() => {
  if (isConnected && chainId && chainId !== bsc.id && chainId !== bscTestnet.id) {
    // Chỉ switch nếu không phải BSC networks
    toast.warning('Vui lòng chuyển sang BNB Smart Chain hoặc BSC Testnet');
  }
}, [isConnected, chainId]);
```

## Luồng Hoạt Động

```text
User vào /wallet
       ↓
Hiển thị Network Selector với mạng hiện tại
       ↓
User click dropdown → Chọn "BSC Testnet (97)"
       ↓
switchChain({ chainId: 97 })
       ↓
MetaMask prompt → User approve
       ↓
Network changed → Badge cập nhật + Hiển thị banner cảnh báo Testnet
       ↓
User có thể test PPLP Minting trên Testnet! ✅
```

## Tóm Tắt

| Thay Đổi | Chi Tiết |
|----------|----------|
| Import | `bscTestnet`, `DropdownMenu`, icons |
| Handler | `handleSwitchToTestnet`, `handleSwitchToMainnet` |
| UI | Network Selector dropdown thay badge tĩnh |
| State | `networkConfig` memo dựa trên chainId |
| Banner | Cảnh báo khi đang ở Testnet |
| Loại bỏ | Auto-switch về Mainnet bắt buộc |

## Thời Gian Triển Khai

~10 phút

