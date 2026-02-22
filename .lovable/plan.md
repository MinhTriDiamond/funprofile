

# Nang cap trang Danh sach Thanh vien (/users)

## Thay doi 1: Them cot Email (chi Admin thay)

Hien tai hook `useUserDirectory` khong fetch email. Can bo sung:
- Goi RPC `get_user_emails_for_admin` (da co san) trong `useUserDirectory.ts` khi user da dang nhap va co quyen admin
- Them truong `email` vao `UserDirectoryEntry`
- Hien thi cot "Email" trong bang tai `Users.tsx`, chi render khi user la admin

## Thay doi 2: Them nut Xoa tai khoan (chi Admin thay)

- Them nut xoa (icon Trash) tren moi hang trong bang, chi hien khi la admin
- Khi nhan, hien dialog xac nhan (AlertDialog) voi ten user
- Goi edge function `admin-delete-user` (da co san) de xoa tai khoan
- Sau khi xoa thanh cong, invalidate query va hien thong bao

## Thay doi 3: Guest co the xem trang

- Trang `/users` da nam ngoai auth guard (khong bi bao ve), nen guest co the truy cap
- Tuy nhien, du lieu hien tai fetch tu bang `profiles` truc tiep, co the bi RLS chan. Can kiem tra va dam bao:
  - Hook `useUserDirectory` su dung cac bang/RPC ma `anon` role co quyen doc
  - Neu RLS chan guest, se bo sung policy cho phep SELECT tren cac bang can thiet (profiles, light_reputation, reward_claims, donations) hoac su dung view `public_profiles`

## Chi tiet ky thuat

### File: `src/hooks/useUserDirectory.ts`
- Import `supabase.auth.getUser()` de kiem tra dang nhap
- Neu co user, goi RPC `get_user_emails_for_admin` de lay email
- Map email vao `UserDirectoryEntry.email`
- Export them `isAdmin` flag tu hook

### File: `src/pages/Users.tsx`
- Nhan `isAdmin` tu hook
- Them cot "Email" vao bang (chi render khi `isAdmin`)
- Them cot "Hanh dong" voi nut xoa (chi render khi `isAdmin`)
- Them AlertDialog xac nhan xoa
- Goi edge function `admin-delete-user` khi xac nhan

### RLS: Dam bao guest doc duoc
- Kiem tra RLS cua bang `profiles`, `light_reputation`, `reward_claims`, `donations`
- Neu can, them policy SELECT cho role `anon` (chi cac truong cong khai)
- Hoac chuyen sang dung `public_profiles` view cho guest

