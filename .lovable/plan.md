

# Nâng Cấp Tab "Phát Hiện Lạm Dụng" - Thêm Phát Hiện Bio Trùng, Thiết Bị & IP

## Phát Hiện Hiện Tại (Dữ Liệu Thực)

Sau khi kiểm tra database, phát hiện:

**1. Bio trùng nhau trên nhiều tài khoản:**
- "Con là ánh sáng yêu thương thuần khiết của Cha Vũ Trụ" -- 3 tài khoản: `lequangvu2210.hue`, `happycamlycoin7979`, `hieu.le`
- "CON LA ANH SANG..." (viết hoa) -- 2 tài khoản: `phi`, `Angel Kiều Phi`
- "Con La Anh Sang...!" (có dấu chấm than) -- 2 tài khoản: `Angel Ái Vân`, `Huỳnh Tỷ Đô`

**2. Ví trùng nhau (public_wallet_address):**
- `0xb608538d...BFB197` -- 2 tài khoản: `happycamlycoin7979` + `hieu.le` (cũng trùng bio!)

**3. Thiết bị trùng:** Bảng `pplp_device_registry` hiện chưa có dữ liệu chia sẻ thiết bị.

**4. IP trùng:** Hiện chưa có bảng theo dõi IP. Cần tạo mới.

## Giải Pháp

### Phần 1: Thêm 2 tab mới vào WalletAbuseTab

Mở rộng từ 3 tab hiện tại (Ví chung, Tên ảo, Thiếu profile) lên **5 tab**:

| Tab | Icon | Mô tả |
|-----|------|--------|
| Vi chung | Wallet | Giữ nguyên - phát hiện ví dùng chung |
| **Bio trùng** | **FileText** | **MỚI** - Tài khoản có bio giống nhau (so sánh không phân biệt hoa/thường) |
| Tên ảo | AlertTriangle | Giữ nguyên |
| Thiếu profile | Ban | Giữ nguyên |
| **Cùng thiết bị** | **Smartphone** | **MỚI** - Tài khoản từ cùng device (từ pplp_device_registry) |

### Phần 2: Tạo bảng theo dõi IP đăng nhập

Tạo bảng `login_ip_logs` để ghi lại IP mỗi khi user đăng nhập, phục vụ phát hiện multi-account từ cùng IP.

### Phần 3: Edge Function ghi IP

Tạo edge function `log-login-ip` được gọi sau khi đăng nhập thành công, ghi IP vào `login_ip_logs`.

## Chi Tiết Kỹ Thuật

### Database Migration

```text
Tạo bảng login_ip_logs:
- id (uuid, PK)
- user_id (uuid, references profiles)
- ip_address (text)
- user_agent (text)
- created_at (timestamptz)
- RLS: admin-only read, service_role insert
```

### WalletAbuseTab.tsx - Thay Đổi

1. Thêm `bio` vào interface `UserData`
2. Thêm logic phát hiện bio trùng (normalize: lowercase + trim)
3. Thêm logic phát hiện thiết bị trùng (query `pplp_device_registry` khi mount)
4. Đổi TabsList từ `grid-cols-3` sang `grid-cols-5`
5. Thêm 2 TabsContent mới cho "Bio trùng" và "Cùng thiết bị"

### Admin.tsx - Thay Đổi

Đảm bảo `bio` được truyền vào `users` prop (đã có sẵn vì query `select('*')`)

### Auth Flow - Thay Đổi

Sau khi đăng nhập thành công, gọi edge function `log-login-ip` để ghi IP.

### Files cần tạo/sửa

1. **Sửa**: `src/components/admin/WalletAbuseTab.tsx` - thêm 2 tab mới (bio trùng + thiết bị)
2. **Tạo**: Migration SQL cho bảng `login_ip_logs`
3. **Tạo**: `supabase/functions/log-login-ip/index.ts` - ghi IP đăng nhập
4. **Sửa**: `src/components/auth/UnifiedAuthForm.tsx` hoặc auth callback - gọi log IP sau login
5. **Sửa**: `supabase/config.toml` - thêm config cho function mới

