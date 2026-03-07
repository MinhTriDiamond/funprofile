

## Kết quả rà soát — 4 lỗi cần sửa

### Lỗi 1 (Nghiêm trọng): `connect-external-wallet/index.ts` — Duplicate variable declarations

Edge function khai báo `const supabaseUrl` 2 lần (dòng 23 và 38) và `const supabaseServiceKey` 2 lần (dòng 39 và 79). Deno sẽ crash ngay với `SyntaxError: Identifier already declared`.

**Sửa**: Xóa khai báo trùng ở dòng 38-40. Dòng 79 cũng phải xóa, dùng lại biến đã khai báo.

---

### Lỗi 2 (Nghiêm trọng): `check-email-exists/index.ts` — Chỉ kiểm tra 50 users

Hiện tại dùng `adminClient.auth.admin.listUsers({ perPage: 50 })` rồi filter in-memory. Với hơn 500 users trong hệ thống, function sẽ **bỏ sót collision** nếu email thuộc user ngoài top 50.

Ngoài ra có dead code (dòng 52-61) không làm gì.

**Sửa**: Tạo một DB function (`check_email_collision`) dùng `SECURITY DEFINER` để query trực tiếp `auth.users` theo email, thay vì list toàn bộ users. Xóa dead code.

---

### Lỗi 3 (Nhỏ): `LinkEmailDialog.tsx` — URL construction

Dùng `VITE_SUPABASE_PROJECT_ID` để tự build URL (`https://${projectId}.supabase.co/...`). Nên dùng `VITE_SUPABASE_URL` cho nhất quán và đúng pattern với phần còn lại của project.

**Sửa**: Đổi sang `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-email-exists`.

---

### Lỗi 4 (Nhỏ): `connect-external-wallet` — Không ghi activity log

Theo plan, edge function nên ghi `wallet_link_succeeded` / `wallet_link_failed` vào `account_activity_logs` (trusted path). Hiện tại function không ghi.

**Sửa**: Thêm insert vào `account_activity_logs` sau khi link thành công/thất bại, dùng service role client.

---

### Tổng kết files cần sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/connect-external-wallet/index.ts` | Xóa duplicate declarations + thêm activity log |
| `supabase/functions/check-email-exists/index.ts` | Thay listUsers bằng DB function, xóa dead code |
| `src/components/security/LinkEmailDialog.tsx` | Sửa URL construction |
| Migration SQL mới | Tạo `check_email_collision` function |

