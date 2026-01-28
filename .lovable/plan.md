
# Kế Hoạch Sửa Lỗi Kết Nối Ví và Thêm Nút Ngắt Kết Nối

## Phân Tích Hiện Trạng

### Dữ liệu ví của user hoangtydo88:
| Trường | Giá trị |
|--------|---------|
| `custodial_wallet_address` | `0x2e11f6e05fb1bb6f985d98a6e0e630e72d0af6bd` |
| `external_wallet_address` | **NULL** (chưa kết nối MetaMask) |
| `default_wallet_type` | `custodial` |

### Giải thích:
- **Ví đang hiển thị (`0x2e11...f6bd`)** là **F.U. Custodial Wallet** - ví do hệ thống tạo tự động
- **Đây không phải ví MetaMask cá nhân của bạn** - Để kết nối ví MetaMask riêng, bạn cần nhấn "Connect MetaMask" và ký xác nhận
- Hiện tại **nút Disconnect chỉ xuất hiện khi đang dùng External wallet (MetaMask)**

## Những Thay Đổi Cần Làm

### Phần 1: Thêm Logic Kết Nối Ví MetaMask và Lưu vào Database

**Vấn đề hiện tại:**
- Khi nhấn "Connect MetaMask", ví chỉ kết nối tạm thời qua wagmi
- Địa chỉ MetaMask KHÔNG được lưu vào `external_wallet_address` trong database
- Khi refresh trang, phải kết nối lại

**Giải pháp:**
- Sau khi kết nối MetaMask thành công, gọi Edge Function `connect-external-wallet` để:
  1. Yêu cầu user ký message xác nhận quyền sở hữu ví
  2. Verify signature trên server
  3. Lưu địa chỉ vào `profiles.external_wallet_address`

### Phần 2: Cải Thiện UI Nút Ngắt Kết Nối

**Thay đổi:**
```text
┌─────────────────────────────────────────────────────────────────┐
│                       WALLET HEADER UI                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [F.U. Wallet]  [MetaMask]    BNB Smart Chain    user  0x123... │
│                                                                  │
│  Hiện tại (Custodial mode):                                     │
│  ├─ [Connect MetaMask] button                                   │
│  └─ KHÔNG có Disconnect                                         │
│                                                                  │
│  Sau khi sửa (Custodial mode):                                  │
│  ├─ [Connect MetaMask] button (để liên kết ví ngoài)            │
│  ├─ Nếu đã có external_wallet_address:                          │
│  │   └─ [Unlink MetaMask] button                                │
│  └─ Info text: "Ví F.U. không thể xóa, chỉ có thể thêm MetaMask"│
│                                                                  │
│  External mode (MetaMask connected):                             │
│  ├─ [Switch Account] button                                     │
│  ├─ [Disconnect] button (ngắt kết nối tạm thời)                 │
│  └─ [Unlink from Profile] button (xóa khỏi database)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phần 3: Edge Function Mới - `disconnect-external-wallet`

**Chức năng:**
- Xóa `external_wallet_address` khỏi profile
- Chuyển `default_wallet_type` về `custodial`
- Yêu cầu xác nhận từ user

## Chi Tiết Triển Khai

### File 1: Tạo Edge Function `disconnect-external-wallet`

**Path:** `supabase/functions/disconnect-external-wallet/index.ts`

**Logic:**
```text
1. Verify JWT -> get user_id
2. Update profiles SET external_wallet_address = NULL, default_wallet_type = 'custodial'
3. Return success
```

### File 2: Cập nhật WalletCenterContainer.tsx

**Thay đổi 1:** Thêm function `linkWalletToProfile`
```typescript
// Sau khi MetaMask kết nối thành công, lưu vào database
const linkWalletToProfile = async () => {
  if (!address) return;
  
  const message = `Xác nhận liên kết ví ${address} với tài khoản F.U. Profile của bạn.\n\nTimestamp: ${Date.now()}`;
  
  // Request signature from MetaMask
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  });
  
  // Send to edge function
  const { data, error } = await supabase.functions.invoke('connect-external-wallet', {
    body: { wallet_address: address, signature, message }
  });
  
  if (data?.success) {
    await fetchWalletProfile();
    toast.success('Đã liên kết ví MetaMask thành công!');
  }
};
```

**Thay đổi 2:** Thêm function `unlinkWalletFromProfile`
```typescript
const unlinkWalletFromProfile = async () => {
  const { data, error } = await supabase.functions.invoke('disconnect-external-wallet');
  
  if (data?.success) {
    setActiveWalletType('custodial');
    await fetchWalletProfile();
    disconnect(); // Also disconnect wagmi
    toast.success('Đã hủy liên kết ví MetaMask');
  }
};
```

**Thay đổi 3:** Cập nhật UI buttons
- Thêm nút "Liên kết" sau khi connect MetaMask (nếu chưa lưu vào DB)
- Thêm nút "Hủy liên kết" cho ví external đã lưu
- Thêm tooltip giải thích sự khác biệt giữa 2 loại ví

### File 3: Cập nhật supabase/config.toml

Thêm cấu hình cho edge function mới:
```toml
[functions.disconnect-external-wallet]
verify_jwt = false
```

## User Flow Sau Khi Sửa

```text
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE WALLET FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User mới đăng ký:                                              │
│  1. Hệ thống tự động tạo F.U. Custodial Wallet                  │
│  2. Hiển thị địa chỉ ví custodial (0xABC...)                    │
│  3. User có thể kết nối thêm ví MetaMask:                       │
│     a. Click "Connect MetaMask"                                 │
│     b. Approve trong MetaMask                                   │
│     c. Click "Liên kết với Profile"                             │
│     d. Ký message xác nhận                                      │
│     e. Địa chỉ được lưu vào external_wallet_address             │
│  4. User có thể switch giữa 2 ví                                │
│                                                                  │
│  Ngắt kết nối MetaMask:                                         │
│  • "Disconnect" = Ngắt kết nối tạm thời (có thể connect lại)    │
│  • "Hủy liên kết" = Xóa khỏi database (phải ký lại để liên kết) │
│                                                                  │
│  F.U. Wallet:                                                   │
│  • KHÔNG THỂ xóa hoặc ngắt kết nối                              │
│  • Luôn available cho user                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `supabase/functions/disconnect-external-wallet/index.ts` | CREATE | Edge function hủy liên kết ví |
| `supabase/config.toml` | UPDATE | Thêm config cho disconnect-external-wallet |
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE | Thêm logic link/unlink wallet + UI buttons |

## Phân Biệt Rõ Hai Loại Ví

| Tính năng | F.U. Custodial Wallet | MetaMask External |
|-----------|----------------------|-------------------|
| **Tạo bởi** | Hệ thống tự động | User kết nối |
| **Private key** | Lưu encrypted trong DB | User quản lý |
| **Có thể xóa?** | ❌ Không | ✅ Có thể hủy liên kết |
| **Yêu cầu MetaMask?** | Không | Có |
| **Send tokens** | Qua Edge Function | Trực tiếp qua MetaMask |
| **Claim rewards** | ✅ Có thể | ✅ Có thể |

## Bổ Sung: Hiển Thị Rõ Địa Chỉ Ví Đang Dùng

Thêm badge/tooltip cho user hiểu:
- "Đây là ví F.U. được tạo tự động cho bạn"
- "Muốn dùng ví MetaMask riêng? Nhấn 'Connect MetaMask' và 'Liên kết'"
