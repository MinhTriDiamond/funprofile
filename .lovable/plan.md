

## Lọc giao dịch ví ngoài: chỉ ghi nhận từ ngày user đăng ký

### Vấn đề
Hiện tại các scanner (auto-scan, fast-scan, scan-my-incoming, detect-incoming-transfers) ghi nhận **tất cả** giao dịch từ ví ngoài vào ví user, kể cả những giao dịch xảy ra **trước khi** user đăng ký tài khoản Fun.Rich. User yêu cầu chỉ ghi nhận giao dịch từ thời điểm đăng ký trở đi.

### Giải pháp
Thêm `created_at` vào query profiles, sau đó khi build donation records, so sánh `block_timestamp` của giao dịch với `created_at` của recipient — bỏ qua nếu giao dịch xảy ra trước ngày đăng ký.

### Các file cần sửa

#### 1. `supabase/functions/auto-scan-donations/index.ts`
- Dòng ~94: thêm `created_at` vào select profiles:
  ```
  .select("id, public_wallet_address, wallet_address, external_wallet_address, username, display_name, created_at")
  ```
- Mở rộng type `walletToProfile` map để lưu thêm `created_at`.
- Dòng ~192 (vòng lặp build donations): thêm kiểm tra:
  ```ts
  if (transfer.block_timestamp < recipientProfile.created_at) continue;
  ```

#### 2. `supabase/functions/fast-scan-donations/index.ts`
- Dòng ~57: thêm `created_at` vào select profiles.
- Mở rộng `walletToProfile` map lưu `created_at`.
- Dòng ~165 (vòng lặp build donations): thêm kiểm tra `block_timestamp < recipientProfile.created_at` → skip.

#### 3. `supabase/functions/scan-my-incoming/index.ts`
- Dòng ~108: thêm `created_at` vào select profile của user hiện tại.
- Dòng ~193 (vòng lặp build donations): thêm kiểm tra `block_timestamp < profile.created_at` → skip.

#### 4. `supabase/functions/detect-incoming-transfers/index.ts`
- Dòng ~100: thêm `created_at` vào select profiles.
- Mở rộng `walletToRecipient` map lưu `created_at`.
- Dòng ~192 (vòng lặp build donations): thêm kiểm tra `block_timestamp < recipient.created_at` → skip.

### Logic chung cho cả 4 file
```ts
// So sánh thời gian giao dịch với ngày đăng ký user
const txTime = new Date(transfer.block_timestamp).getTime();
const regTime = new Date(recipientProfile.created_at).getTime();
if (txTime < regTime) continue; // bỏ qua giao dịch trước ngày đăng ký
```

### File thay đổi
1. `supabase/functions/auto-scan-donations/index.ts`
2. `supabase/functions/fast-scan-donations/index.ts`
3. `supabase/functions/scan-my-incoming/index.ts`
4. `supabase/functions/detect-incoming-transfers/index.ts`

