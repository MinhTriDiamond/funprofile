

# Sửa hiển thị thông báo lỗi chi tiết khi Claim bị từ chối

## Nguyên nhân gốc

Edge function `claim-reward` hoạt động đúng: chặn những user chưa cập nhật ví (`public_wallet_address = null`) với mã 403 kèm thông báo tiếng Việt cụ thể.

Tuy nhiên, Supabase JS SDK khi nhận non-2xx status chỉ trả về lỗi chung "Edge Function returned a non-2xx status code" mà không parse body chứa thông báo cụ thể. Cần sửa hook `useClaimReward` để đọc body từ response lỗi.

## Thay doi

**File**: `src/hooks/useClaimReward.ts`

Khi `response.error` xay ra, doc body tu `response.error.context` (la doi tuong Response goc) de lay thong bao cu the tu edge function:

```typescript
if (response.error) {
  // Try to extract specific error message from response body
  let errorMsg = response.error.message || 'Loi khong xac dinh';
  try {
    const errorBody = await response.error.context?.json();
    if (errorBody?.message) {
      errorMsg = errorBody.message;
    }
  } catch {}
  setError(errorMsg);
  toast.error(errorMsg);
  return null;
}
```

Thay doi nay giup dialog hien thi dung thong bao nhu "Vui long cap nhat dia chi vi trong trang ca nhan truoc khi claim" thay vi loi chung chung.

## Ket qua mong doi

- User chua co vi: Thay thong bao "Vui long cap nhat dia chi vi trong trang ca nhan truoc khi claim"
- User chua co avatar: Thay thong bao "Vui long cap nhat anh dai dien trong trang ca nhan truoc khi claim"
- User bi treo/tu choi: Thay thong bao tuong ung
- Loi rate limit: Thay thong bao "Vui long cho X giay"

