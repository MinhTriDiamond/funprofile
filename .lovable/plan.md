

# Kế Hoạch Thêm Tính Năng Switch Chain trước khi Ký

## Vấn Đề Hiện Tại

Khi Admin ký mint request, MetaMask đang kết nối BSC Mainnet (chainId 56) nhưng EIP-712 domain yêu cầu chainId 97 (BSC Testnet), dẫn đến lỗi:
```
Provided chainId "97" must match the active chainId "56"
```

## Giải Pháp

Thêm logic tự động kiểm tra và chuyển đổi chain sang BSC Testnet trước khi thực hiện ký hoặc gửi transaction.

## Chi Tiết Kỹ Thuật

### File cần sửa: `src/hooks/usePplpAdmin.ts`

#### 1. Thêm imports cần thiết

```typescript
// Thêm useSwitchChain và useChainId vào imports
import { 
  useAccount, 
  useSignTypedData, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useChainId,
  useSwitchChain  // <-- Thêm mới
} from 'wagmi';
```

#### 2. Khởi tạo hook useSwitchChain trong component

```typescript
export const usePplpAdmin = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();  // <-- Lấy chainId hiện tại
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();  // <-- Thêm mới
  // ... existing code
```

#### 3. Tạo helper function ensureBscTestnet

```typescript
// Helper: Đảm bảo đang ở BSC Testnet trước khi thực hiện action
const ensureBscTestnet = useCallback(async (): Promise<boolean> => {
  const targetChainId = 97; // BSC Testnet
  
  if (chainId === targetChainId) {
    return true; // Đã đúng chain
  }
  
  try {
    toast.info('Đang chuyển sang BSC Testnet...');
    await switchChainAsync({ chainId: targetChainId });
    toast.success('Đã chuyển sang BSC Testnet!');
    return true;
  } catch (error: any) {
    console.error('[usePplpAdmin] Switch chain error:', error);
    
    if (error.message?.includes('User rejected')) {
      toast.error('Bé đã từ chối chuyển mạng');
    } else {
      toast.error('Không thể chuyển sang BSC Testnet. Vui lòng chuyển thủ công trong ví.');
    }
    return false;
  }
}, [chainId, switchChainAsync]);
```

#### 4. Cập nhật signMintRequest - thêm kiểm tra chain

```typescript
const signMintRequest = useCallback(async (request: MintRequest): Promise<string | null> => {
  if (!isConnected || !address) {
    toast.error('Vui lòng kết nối ví Attester trước');
    return null;
  }

  // ✅ Thêm kiểm tra và switch chain
  const isCorrectChain = await ensureBscTestnet();
  if (!isCorrectChain) {
    return null;
  }

  try {
    // ... existing signing logic
  }
}, [isConnected, address, signTypedDataAsync, ensureBscTestnet]);
```

#### 5. Cập nhật submitToChain - thêm kiểm tra chain

```typescript
const submitToChain = useCallback(async (request: MintRequest): Promise<string | null> => {
  if (!isConnected || !address) {
    toast.error('Vui lòng kết nối ví trước');
    return null;
  }

  if (!request.signature) {
    toast.error('Request chưa được ký');
    return null;
  }

  // ✅ Thêm kiểm tra và switch chain
  const isCorrectChain = await ensureBscTestnet();
  if (!isCorrectChain) {
    return null;
  }

  try {
    // ... existing submit logic
  }
}, [isConnected, address, writeContractAsync, ensureBscTestnet]);
```

#### 6. Export thêm state mới

```typescript
return {
  // State
  isLoading,
  mintRequests,
  stats,
  isConnected,
  address,
  isWritePending,
  isConfirming,
  chainId,           // <-- Thêm mới
  isSwitching,       // <-- Thêm mới (để hiện loading khi đang switch)
  
  // Actions
  fetchMintRequests,
  signMintRequest,
  batchSignMintRequests,
  submitToChain,
  confirmTransaction,
  resetToPending,
  fetchActionDetails,
  rejectRequest,
  deleteRequest,
  ensureBscTestnet,  // <-- Thêm mới (optional, nếu cần gọi thủ công)
};
```

## Luồng Hoạt Động Sau Khi Sửa

```text
Admin click [Ký] hoặc [Submit]
       ↓
Kiểm tra chainId === 97?
       ↓
   ┌───┴───┐
   │  NO   │ → switchChainAsync(97) → MetaMask prompt "Switch to BSC Testnet"
   └───────┘                               ↓
       │                           User approve → Continue
       │                           User reject  → Abort + Toast error
   ┌───┴───┐
   │  YES  │ → Tiếp tục signTypedDataAsync / writeContractAsync
   └───────┘
       ↓
   ✅ Thành công!
```

## Tổng Kết Thay Đổi

| Thay Đổi | Vị Trí |
|----------|--------|
| Import `useSwitchChain` | Line 2 |
| Khởi tạo `switchChainAsync`, `isSwitching` | Line ~73 |
| Tạo `ensureBscTestnet` helper | Sau line ~90 |
| Gọi `ensureBscTestnet()` trong `signMintRequest` | Line ~165 |
| Gọi `ensureBscTestnet()` trong `submitToChain` | Line ~250 |
| Export thêm `chainId`, `isSwitching`, `ensureBscTestnet` | Return object |

## Thời Gian Triển Khai

~15 phút

