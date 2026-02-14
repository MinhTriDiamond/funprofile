
# Cập nhật lịch sử giao dịch và thông báo sau khi Claim thành công

## Vấn đề
Sau khi claim CAMLY thành công, giao dịch được ghi vào bảng `transactions` và thông báo vào bảng `notifications` bởi Edge Function, nhưng giao diện không tự động cập nhật vì:
1. `onSuccess` trong `WalletCenterContainer` chỉ gọi `fetchClaimableReward()` và `refetchExternal()` -- không refresh lịch sử giao dịch
2. Component `RecentTransactions` quản lý state nội bộ, không có cơ chế để parent trigger refetch

## Giải pháp

### 1. Chuyển `useTransactionHistory` sang dùng React Query
**File**: `src/hooks/useTransactionHistory.ts`

Thay vì dùng `useState` + `useEffect` thủ công, chuyển sang `useQuery` từ `@tanstack/react-query` để có thể invalidate từ bất kỳ đâu thông qua `queryKey: ['transaction-history']`.

### 2. Invalidate cache sau khi claim thành công
**File**: `src/hooks/useClaimReward.ts`

Thêm invalidation cho `transaction-history` và `notifications` vào callback thành công, cùng với `reward-stats` đã có:

```typescript
queryClient.invalidateQueries({ queryKey: ['reward-stats'] });
queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
```

### 3. Cập nhật component RecentTransactions
**File**: `src/components/wallet/RecentTransactions.tsx`

Sử dụng hook đã chuyển sang React Query thay vì state thủ công.

## Chi tiết kỹ thuật

- `useTransactionHistory` sẽ dùng `useQuery` với `queryKey: ['transaction-history']`
- `useClaimReward` sẽ invalidate thêm key `transaction-history` sau khi claim thành công
- Không cần thay đổi `WalletCenterContainer` hay `ClaimRewardDialog` vì invalidation xảy ra tự động qua React Query
- Giữ nguyên chức năng `refreshTxStatus` để kiểm tra trạng thái pending trên blockchain
