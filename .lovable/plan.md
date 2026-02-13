
# Sửa Lỗi Claim FUN Money Không Hiển Thị Trong Chờ Ký

## Vấn Đề

Khi người dùng bấm "Claim FUN Money" trong trang Wallet, yêu cầu mint **không xuất hiện** trong tab "Chờ ký" của Admin. Nguyên nhân có 2 lỗi:

### Lỗi 1: Claim chỉ gửi 10 actions (thay vì tất cả)
- Component `LightScoreDashboard` lấy danh sách actions từ `data.recent_actions` (RPC `get_user_light_score` chỉ trả về **10 actions gần nhất**)
- Khi bấm Claim, chỉ gửi 10 action IDs đó lên server
- Kết quả: mint request chỉ có ~150 FUN thay vì 5,091 FUN

### Lỗi 2: Kiểm tra ví sử dụng sai trường
- `LightScoreDashboard` kiểm tra `custodial_wallet_address` và `external_wallet_address`
- Nhưng edge function `pplp-mint-fun` yêu cầu `public_wallet_address`
- Người dùng đã cài `public_wallet_address` nhưng hệ thống có thể hiểu sai là "chưa có ví"

## Kế Hoạch Sửa

### Bước 1: Sửa `LightScoreDashboard` - Dùng `usePendingActions` thay vì `recent_actions`
**File**: `src/components/wallet/LightScoreDashboard.tsx`

Thay đổi:
- Import và sử dụng hook `usePendingActions` (đã có sẵn, dùng trong `ClaimRewardsCard`)
- Hook này truy vấn **TẤT CẢ** light_actions có `mint_status = 'approved'` (không giới hạn 10)
- Khi bấm Claim, gửi tất cả action IDs lên server
- Sửa hàm `handleClaimAll` để dùng actions từ `usePendingActions`

### Bước 2: Sửa kiểm tra ví - Dùng `public_wallet_address`
**File**: `src/components/wallet/LightScoreDashboard.tsx`

Thay đổi:
- Truy vấn `public_wallet_address` thay vì `custodial_wallet_address` và `external_wallet_address`
- Kiểm tra `!!profile?.public_wallet_address` để xác định người dùng đã cài ví chưa

## Chi Tiết Kỹ Thuật

### File thay đổi: `src/components/wallet/LightScoreDashboard.tsx`

**Thay đổi 1** - Import `usePendingActions`:
```typescript
// Thêm import
import { usePendingActions } from '@/hooks/usePendingActions';
```

**Thay đổi 2** - Sử dụng hook trong component:
```typescript
// Thêm vào component
const { actions: allPendingActions, totalAmount: pendingTotal, claim, isClaiming: isClaimingActions } = usePendingActions();
```

**Thay đổi 3** - Sửa kiểm tra ví (dòng 57-63):
```typescript
// Trước:
.select('custodial_wallet_address, external_wallet_address')
const walletExists = !!(profile?.custodial_wallet_address || profile?.external_wallet_address);

// Sau:
.select('public_wallet_address')
const walletExists = !!profile?.public_wallet_address;
```

**Thay đổi 4** - Sửa hàm `handleClaimAll` (dòng 104-111):
```typescript
// Trước: Chỉ gửi 10 actions từ recent_actions
const pendingActions = data.recent_actions?.filter(a => a.mint_status === 'approved') || [];
const ids = pendingActions.map(a => a.id);
const result = await mintPendingActions(ids);

// Sau: Gửi TẤT CẢ actions từ usePendingActions
const handleClaimAll = async () => {
  if (allPendingActions.length === 0) return;
  const actionIds = allPendingActions.map(a => a.id);
  const result = await claim(actionIds);
  if (result.success) {
    refetch();
  }
};
```

**Thay đổi 5** - Cập nhật nút Claim hiển thị đúng số lượng từ `pendingTotal` và trạng thái `isClaimingActions`.

## Tóm Tắt

| STT | Thay đổi | Mục đích |
|-----|----------|----------|
| 1 | Dùng `usePendingActions` hook | Lấy TẤT CẢ actions chờ claim (không giới hạn 10) |
| 2 | Sửa trường kiểm tra ví | Khớp với yêu cầu `public_wallet_address` của edge function |

- **1 file sửa**: `src/components/wallet/LightScoreDashboard.tsx`
- **0 file mới**
