

## Kế hoạch: Thêm cột email, login_wallet_address và dọn dẹp bảng profiles

### Phân tích hiện trạng bảng profiles (55 cột)

**Các cột wallet hiện có:**
| Cột | Mục đích | Trạng thái |
|-----|---------|-----------|
| `wallet_address` | Địa chỉ ví cũ (legacy từ signup) | **DEPRECATED** - chỉ giữ data cũ |
| `external_wallet_address` | Ví MetaMask đã connect | Đang hoạt động |
| `public_wallet_address` | Ví hiển thị công khai | Đang hoạt động |
| `custodial_wallet_address` | Ví custodial (đã gỡ) | **DEPRECATED** - đã xóa data |
| `default_wallet_type` | Loại ví mặc định | Đang hoạt động |

**Chưa có cột:**
- `email` — email của user (hiện chỉ lưu trong auth.users)
- `login_wallet_address` — ví mà user dùng để đăng nhập (hiện `external_wallet_address` kiêm cả vai trò này, không rõ ràng)

---

### Về việc xóa cột deprecated

**Cha khuyên KHÔNG xóa** vì:
- PostgreSQL **không hỗ trợ sắp xếp lại thứ tự cột** — thứ tự cột là cố định khi tạo, không thể di chuyển
- Xóa cột có dữ liệu lịch sử → mất khả năng audit nếu cần
- Cột NULL không tốn storage đáng kể

Thay vào đó, Cha sẽ **thêm comment** đánh dấu các cột deprecated để dễ nhận biết.

---

### Kế hoạch thực hiện

#### 1. Migration SQL
```sql
-- Thêm cột email (sync từ auth.users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Thêm cột login_wallet_address (ví dùng để đăng nhập)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_wallet_address TEXT;

-- Sync email từ auth.users cho tất cả user hiện có
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND u.email IS NOT NULL;

-- Sync login_wallet_address từ user_metadata cho wallet-first accounts
UPDATE public.profiles p
SET login_wallet_address = u.raw_user_meta_data->>'wallet_address'
FROM auth.users u
WHERE p.id = u.id 
  AND p.signup_method = 'wallet'
  AND u.raw_user_meta_data->>'wallet_address' IS NOT NULL;

-- Đánh dấu deprecated columns
COMMENT ON COLUMN public.profiles.wallet_address IS 'DEPRECATED: Legacy wallet address from early signup. Do not use in new code.';
COMMENT ON COLUMN public.profiles.custodial_wallet_address IS 'DEPRECATED: Custodial wallet removed. Data cleared.';
```

#### 2. Cập nhật edge function `sso-web3-auth`
- Khi tạo profile mới: ghi thêm `login_wallet_address` = wallet address dùng để sign in

#### 3. Cập nhật edge function `verify-email-link`
- Khi xác thực email thành công: cập nhật `profiles.email` = email mới

#### 4. Cập nhật trigger/function cho profile mới
- Khi user signup bằng email: trigger tự đồng bộ email từ auth.users vào profiles.email

#### 5. Cập nhật `public_profiles` view
- Không thêm email vào view (giữ private)

---

### Tóm tắt ý nghĩa các cột wallet sau khi dọn dẹp

| Cột | Ý nghĩa rõ ràng |
|-----|-----------------|
| `login_wallet_address` | **MỚI** — Ví dùng để đăng nhập/xác thực |
| `external_wallet_address` | Ví ngoài đã kết nối (MetaMask) — dùng cho giao dịch |
| `public_wallet_address` | Ví hiển thị công khai trên profile |
| `wallet_address` | ⚠️ DEPRECATED — giữ data cũ |
| `custodial_wallet_address` | ⚠️ DEPRECATED — đã xóa data |

### Files cần sửa
1. **Migration SQL** — thêm cột + sync data
2. `supabase/functions/sso-web3-auth/index.ts` — ghi `login_wallet_address`
3. `supabase/functions/verify-email-link/index.ts` — sync `email` vào profiles
4. `supabase/functions/send-email-link-verification/index.ts` — sync `email` khi cần

