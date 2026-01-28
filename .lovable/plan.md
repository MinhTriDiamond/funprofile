
# Kế Hoạch Sửa Lỗi Địa Chỉ Ví Hiển Thị 0x0000...0000

## Phân Tích Vấn Đề

### Nguyên Nhân
User **hoangtydo88** hiện có:
- `external_wallet_address`: **NULL**
- `custodial_wallet_address`: **NULL**
- Không có record nào trong bảng `custodial_wallets`

Kết quả là dòng code sau trả về fallback `0x0000...0000`:
```typescript
const shortenedAddress = activeWalletAddress 
  ? `${activeWalletAddress.slice(0, 6)}...${activeWalletAddress.slice(-4)}` 
  : '0x0000...0000';
```

### Lý Do User Chưa Có Ví
1. Tài khoản được tạo trước khi logic auto-create được implement
2. Có lỗi khi tạo ví trong quá trình đăng ký
3. User đăng nhập bằng phương thức không trigger auto-create

## Giải Pháp

### Phần 1: Tự động tạo Custodial Wallet khi vào trang Wallet

Thêm useEffect mới trong `WalletCenterContainer.tsx` để kiểm tra và tự động tạo custodial wallet nếu user chưa có:

```text
Logic Flow:
1. User vào trang /wallet
2. Fetch wallet profile
3. Nếu cả custodial_wallet_address và external_wallet_address đều NULL:
   → Gọi create-custodial-wallet edge function
   → Cập nhật UI với địa chỉ mới
4. Hiển thị địa chỉ thật thay vì 0x0000...0000
```

### Phần 2: Hiển thị loading state khi đang tạo ví

Thay vì hiển thị `0x0000...0000`, hiển thị skeleton/loading state khi:
- Đang fetch wallet profile
- Đang tạo ví mới

### Phần 3: Fallback UI rõ ràng

Nếu không thể tạo ví tự động:
- Hiển thị nút "Tạo Ví" thay vì địa chỉ placeholder
- Thông báo lỗi rõ ràng

## Chi Tiết Triển Khai

### File: src/components/wallet/WalletCenterContainer.tsx

**Thay đổi 1**: Thêm state mới
```typescript
const [isCreatingWallet, setIsCreatingWallet] = useState(false);
const [walletCreationError, setWalletCreationError] = useState<string | null>(null);
```

**Thay đổi 2**: Thêm function tạo ví
```typescript
const createCustodialWallet = async () => {
  setIsCreatingWallet(true);
  setWalletCreationError(null);
  
  try {
    const { data, error } = await supabase.functions.invoke('create-custodial-wallet', {
      body: { chain_id: 56 }
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message);
    }

    // Refetch wallet profile to get new address
    await fetchWalletProfile();
    toast.success('Đã tạo ví F.U. Wallet thành công!');
  } catch (err) {
    setWalletCreationError('Không thể tạo ví. Vui lòng thử lại.');
    console.error('[WalletCenter] Create wallet error:', err);
  } finally {
    setIsCreatingWallet(false);
  }
};
```

**Thay đổi 3**: Thêm useEffect auto-create
```typescript
// Auto-create custodial wallet if user has no wallet
useEffect(() => {
  const autoCreateWallet = async () => {
    // Only auto-create if:
    // 1. walletProfile has been fetched
    // 2. User has no custodial OR external wallet
    // 3. Not currently creating wallet
    // 4. MetaMask not connected
    if (
      walletProfile !== null &&
      !walletProfile.custodial_wallet_address &&
      !walletProfile.external_wallet_address &&
      !isCreatingWallet &&
      !isConnected
    ) {
      await createCustodialWallet();
    }
  };

  autoCreateWallet();
}, [walletProfile, isConnected, isCreatingWallet]);
```

**Thay đổi 4**: Update shortenedAddress logic
```typescript
const shortenedAddress = useMemo(() => {
  if (isCreatingWallet) return 'Đang tạo ví...';
  if (activeWalletAddress) {
    return `${activeWalletAddress.slice(0, 6)}...${activeWalletAddress.slice(-4)}`;
  }
  return 'Chưa có ví';
}, [activeWalletAddress, isCreatingWallet]);
```

**Thay đổi 5**: Update UI cho trạng thái loading/error
- Hiển thị spinner khi đang tạo ví
- Hiển thị nút "Tạo lại" nếu có lỗi
- Disable copy button nếu không có địa chỉ

## Files Cần Sửa

| File | Thay đổi |
|------|----------|
| `src/components/wallet/WalletCenterContainer.tsx` | Thêm logic auto-create custodial wallet |

## User Flow Sau Khi Sửa

```text
1. User vào trang /wallet
2. Fetch wallet profile
3. Nếu chưa có ví:
   a. Hiển thị "Đang tạo ví..." 
   b. Gọi create-custodial-wallet
   c. Cập nhật UI với địa chỉ mới
4. User thấy địa chỉ ví thật (0x1234...5678)
5. Có thể Receive/Send/Claim như bình thường
```

## Kết Quả Mong Đợi

- User **hoangtydo88** sẽ có ví custodial được tạo tự động
- Địa chỉ ví hiển thị đúng thay vì `0x0000...0000`
- Trải nghiệm mượt mà với loading state phù hợp
