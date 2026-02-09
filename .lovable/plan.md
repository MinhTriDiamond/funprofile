

# Kế Hoạch: Tính Năng "Chọn Tài Khoản Trong Cùng Một Ví" (Multi-Account Selector)

## Tổng Quan

Xây dựng tính năng cho phép người dùng xem và chuyển đổi giữa nhiều account/address trong cùng 1 ví (ví dụ MetaMask có nhiều accounts). Toàn bộ app sẽ sử dụng đúng Active Account đã chọn cho đọc số dư, ký và gửi giao dịch.

## Phân Tích Hiện Trạng

### Đã có sẵn
| Component | Mô tả |
|-----------|-------|
| `Web3Provider.tsx` | WagmiProvider + RainbowKitProvider, cấu trúc đơn giản |
| `WalletCenterContainer.tsx` | Đã có `handleSwitchAccount` dùng `wallet_requestPermissions` |
| `WalletCard.tsx` | Đã có nút "Switch" và prop `onSwitchAccount` |
| `useSendToken.ts` | Dùng `useAccount().address` để gửi giao dịch |
| `useTokenBalances.ts` | Hỗ trợ `customAddress` option |
| `web3.ts` | wagmi config với BSC chains + RainbowKit connectors |
| `use-mobile.tsx` | Hook phát hiện mobile/desktop |

### Hạn chế của wagmi v2
- `useAccount()` chỉ trả về 1 address (account hiện tại của provider)
- Wagmi không tự động expose danh sách accounts từ connector
- Cần truy cập EIP-1193 provider để gọi `eth_accounts` lấy danh sách

## Kiến Trúc Giải Pháp

```text
+---------------------------------------------------------------------+
|                  ActiveAccountProvider (Context)                     |
|  State: accounts[], activeAddress, lastUsedAt{}                      |
|  Persistence: localStorage key = activeAccount:{connectorId}         |
+---------------------------------------------------------------------+
|                                                                      |
|  +------------------------+    +----------------------------------+  |
|  |  useActiveAccount()    |    |  AccountSelectorModal.tsx        |  |
|  |  - activeAddress       |    |  - Danh sach accounts + balance  |  |
|  |  - accounts[]          |    |  - Tim kiem theo dia chi         |  |
|  |  - setActive()         |    |  - Badge "Dang dung"             |  |
|  |  - refreshAccounts()   |    |  - Identicon cho tung account    |  |
|  +------------------------+    +----------------------------------+  |
|                                                                      |
|  Consumers:                                                          |
|  - WalletCenterContainer (hien thi Active Account)                   |
|  - WalletCard (nut "Chon tai khoan")                                 |
|  - useSendToken (gui tx tu activeAddress)                            |
|  - useTokenBalances (doc balance cua activeAddress)                  |
+---------------------------------------------------------------------+
```

## Chi Tiết Thay Đổi Theo File

### 1. Tạo mới: `src/contexts/ActiveAccountContext.tsx`

**Mục đích:** React Context quản lý multi-account state

**State:**
- `accounts: string[]` -- danh sách địa chỉ được ủy quyền
- `activeAddress: string | null` -- account đang dùng
- `lastUsedAt: Record<string, number>` -- timestamp lần cuối sử dụng mỗi account

**Logic chính:**
- Khi ví kết nối: lấy `connector.getProvider()` rồi gọi `provider.request({ method: 'eth_accounts' })` để lấy danh sách accounts
- Lưu `activeAddress` vào `localStorage` theo key: `activeAccount:{connectorId}`
- Lắng nghe sự kiện `accountsChanged` từ provider:
  - Cập nhật `accounts[]`
  - Nếu `activeAddress` không còn trong danh sách -> fallback sang `accounts[0]` + toast cảnh báo
- Lắng nghe thay đổi từ wagmi `useAccount`: đồng bộ nếu provider đổi account
- Khi disconnect: xóa toàn bộ state
- Export: `ActiveAccountProvider`, `useActiveAccount()` hook

### 2. Tạo mới: `src/components/wallet/AccountSelectorModal.tsx`

**Mục đích:** UI cho phép chọn tài khoản

**Thiết kế:**
- Dialog trên desktop, full-width drawer trên mobile (dùng `useIsMobile()` có sẵn)
- Danh sách accounts hiển thị:
  - Identicon (tạo từ address bằng CSS gradient, không cần thư viện ngoài)
  - Địa chỉ rút gọn: `0x1234...ABCD`
  - Badge "Đang dùng" cho account hiện tại
  - Số dư BNB native cho từng account (lazy load với skeleton)
  - Sắp xếp theo `lastUsedAt` giảm dần
- Ô tìm kiếm lọc theo address (debounce)
- Click chọn account -> set active + đóng modal + toast thông báo
- Nút "Làm mới danh sách" gọi lại `eth_accounts`
- Nếu chỉ có 1 account: hiển thị 1 dòng, không cần switch

### 3. Tạo mới: `src/components/wallet/AccountMismatchModal.tsx`

**Mục đích:** Modal cảnh báo khi địa chỉ provider khác với active address

**Khi nào hiển thị:** Khi phát hiện `useAccount().address !== activeAddress`

**Hai lựa chọn:**
- (A) Đồng bộ active theo ví (set active = provider address)
- (B) Yêu cầu người dùng chuyển account trong ví để khớp active

**Tự đóng khi đã khớp.**

### 4. Sửa: `src/components/providers/Web3Provider.tsx`

**Thay đổi:** Bọc thêm `ActiveAccountProvider` bên trong WagmiProvider

```tsx
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <RainbowKitProvider>
      <ActiveAccountProvider>
        {children}
      </ActiveAccountProvider>
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

Lưu ý: Hiện tại Web3Provider chưa có `QueryClientProvider` -- sẽ đặt `ActiveAccountProvider` ở vị trí phù hợp trong cây component, sau RainbowKitProvider để có thể dùng wagmi hooks.

### 5. Sửa: `src/components/wallet/WalletCenterContainer.tsx`

**Thay đổi chính:**
- Import `useActiveAccount` từ context mới
- Dùng `activeAddress` thay vì chỉ dùng `useAccount().address` cho mọi nơi cần address
- Thay thế `handleSwitchAccount` (hiện gọi `wallet_requestPermissions`) bằng việc mở `AccountSelectorModal`
- Truyền `activeAddress` cho `useTokenBalances({ customAddress: activeAddress })`
- Hiển thị số lượng accounts trong UI (ví dụ: "Tài khoản 1/3")
- Thêm nút "Chọn tài khoản" mở AccountSelectorModal
- Tích hợp `AccountMismatchModal` để bắt trường hợp bất đồng bộ

### 6. Sửa: `src/components/wallet/WalletCard.tsx`

**Thay đổi:**
- Thêm prop `accountCount?: number` để hiển thị số lượng accounts
- Nút "Switch" đổi thành "Chọn tài khoản (X)" với số lượng
- Thêm indicator nhỏ khi có nhiều hơn 1 account

### 7. Sửa: `src/hooks/useSendToken.ts`

**Thay đổi quan trọng:**
- Import `useActiveAccount` từ context
- Xác nhận `activeAddress` nằm trong `accounts[]` trước khi gửi
- Truyền `account: activeAddress` vào `sendTransactionAsync` (wagmi v2 hỗ trợ tham số `account`)
- Nếu `activeAddress !== useAccount().address`: hiển thị cảnh báo/chặn gửi

```tsx
const sendToken = async (params: SendTokenParams) => {
  const senderAddress = activeAddress || providerAddress;
  
  // Kiểm tra active address còn được ủy quyền
  if (activeAddress && !accounts.includes(activeAddress.toLowerCase())) {
    toast.error('Tài khoản không còn được ủy quyền. Vui lòng kết nối lại.');
    return null;
  }
  
  // Cảnh báo nếu bất đồng bộ
  if (activeAddress && providerAddress && 
      activeAddress.toLowerCase() !== providerAddress.toLowerCase()) {
    toast.error('Tài khoản trong ví khác với tài khoản đang chọn. Vui lòng đồng bộ.');
    return null;
  }

  // Gửi giao dịch với account cụ thể
  txHash = await sendTransactionAsync({
    account: senderAddress as `0x${string}`,
    to: ...,
    value/data: ...,
  });
};
```

### 8. Sửa: `src/hooks/useTokenBalances.ts`

**Thay đổi nhỏ:**
- Hook này đã hỗ trợ `customAddress` option
- `WalletCenterContainer` sẽ truyền `activeAddress` vào thay vì dùng `address` trực tiếp
- Không cần sửa logic bên trong hook

## Luồng Xử Lý Chính

```text
1. Người dùng kết nối ví (RainbowKit)
   -> wagmi: useAccount().address = accounts[0]
   -> ActiveAccountContext: gọi eth_accounts -> lưu accounts[]
   -> Đặt activeAddress = giá trị đã lưu localStorage || accounts[0]

2. Người dùng mở Account Selector
   -> Thấy danh sách accounts với số dư
   -> Chọn account khác
   -> Đặt activeAddress mới -> lưu localStorage
   -> App re-render với address mới

3. Người dùng đổi account trong ví (popup MetaMask)
   -> Provider phát sự kiện accountsChanged
   -> ActiveAccountContext cập nhật accounts[]
   -> Nếu active không còn -> fallback accounts[0] + toast
   -> Nếu active vẫn còn -> giữ nguyên, kiểm tra mismatch

4. Phát hiện bất đồng bộ (provider address != active address)
   -> Hiển thị AccountMismatchModal
   -> Người dùng chọn: đồng bộ theo ví HOẶC yêu cầu đổi trong ví

5. Người dùng gửi giao dịch
   -> useSendToken kiểm tra activeAddress trong accounts[]
   -> Kiểm tra chainId = 56
   -> Gửi tx với account: activeAddress
```

## Xử Lý Lỗi

| Lỗi | Xử lý |
|-----|-------|
| Provider không hỗ trợ multi-account | Fallback: dùng useAccount().address, ẩn selector |
| `eth_accounts` trả về mảng rỗng | Toast: "Không tìm thấy tài khoản. Vui lòng kết nối lại" |
| Active address bị xóa khỏi ví | Tự động fallback accounts[0] + toast cảnh báo |
| Bất đồng bộ provider vs active | Modal cho người dùng chọn cách đồng bộ |
| Connector không có getProvider | Graceful fallback: chỉ dùng useAccount().address |

## Danh Sách Files

| File | Hành động |
|------|-----------|
| `src/contexts/ActiveAccountContext.tsx` | **Tạo mới** -- Context + Provider + useActiveAccount hook |
| `src/components/wallet/AccountSelectorModal.tsx` | **Tạo mới** -- UI chọn tài khoản |
| `src/components/wallet/AccountMismatchModal.tsx` | **Tạo mới** -- Modal cảnh báo bất đồng bộ |
| `src/components/providers/Web3Provider.tsx` | **Sửa** -- Bọc thêm ActiveAccountProvider |
| `src/components/wallet/WalletCenterContainer.tsx` | **Sửa** -- Dùng activeAddress, tích hợp selector + mismatch modal |
| `src/components/wallet/WalletCard.tsx` | **Sửa** -- Hiển thị số lượng accounts |
| `src/hooks/useSendToken.ts` | **Sửa** -- Kiểm tra và gửi tx theo activeAddress |

## Ghi Chú Kỹ Thuật

- **Không dùng ethers** -- Toàn bộ dùng viem v2 + wagmi v2
- **localStorage persistence** -- Key: `activeAccount:{connectorId}`, value: address
- **Identicon** -- Tạo từ address bằng CSS gradient (không cần thư viện ngoài)
- **Hiệu năng** -- Lazy load balance cho từng account, debounce tìm kiếm
- **Bảo mật** -- Tuyệt đối không lưu private key. Chỉ ký/gửi qua provider/walletClient
- **Responsive** -- Dialog trên desktop, drawer trên mobile (dùng `useIsMobile()` có sẵn)
- **Tương thích ngược** -- Nếu context chưa sẵn sàng hoặc chỉ có 1 account, app hoạt động như cũ
