

## Sửa lỗi: Cho phép claim dưới 200.000 CAMLY

### Vấn đề
Hệ thống hiện tại có ngưỡng tối thiểu `MINIMUM_CLAIM = 1` ở cả edge function và dialog claim, nghĩa là người dùng có thể claim bất kỳ số lượng nào từ 1 CAMLY trở lên. Giao diện `ClaimRewardsSection` hiển thị ngưỡng 200.000 nhưng không thực sự chặn ở phía server.

### Thay đổi

#### 1. Edge Function: `supabase/functions/claim-reward/index.ts`
- Thay `MINIMUM_CLAIM = 1` thanh `MINIMUM_CLAIM = 200000`
- Cap nhat thong bao loi tu "lon hon 0 CAMLY" thanh "toi thieu 200.000 CAMLY"

#### 2. Frontend: `src/components/wallet/ClaimRewardDialog.tsx`
- Thay `MINIMUM_CLAIM = 1` thanh `MINIMUM_CLAIM = 200000`
- Dam bao nut Claim bi vo hieu hoa khi so luong < 200.000

### Chi tiet ky thuat

**Edge Function (dong 14, 328-335):**
```typescript
const MINIMUM_CLAIM = 200000; // Toi thieu 200.000 CAMLY

// Validation message:
message: 'Can toi thieu 200.000 CAMLY de claim. Hay tiep tuc hoat dong de tich luy them!'
```

**ClaimRewardDialog.tsx (dong 19):**
```typescript
const MINIMUM_CLAIM = 200000;
```

### Ket qua
- Server se tu choi moi yeu cau claim duoi 200.000 CAMLY voi thong bao ro rang
- Frontend se vo hieu hoa nut claim khi chua du 200.000 CAMLY
- Dong bo voi giao dien ClaimRewardsSection da hien thi ngưỡng 200.000

