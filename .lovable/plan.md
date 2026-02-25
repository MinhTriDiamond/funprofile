

# Chan hoan toan tai khoan bi ban

## Muc tieu
User bi ban (`is_banned = true`) se bi dang xuat va khong the dang nhap lai. Lich su bai viet, binh luan van giu nguyen trong he thong de kiem toan.

## Giai phap: Chan tai tang xac thuc

Thay vi chen kiem tra vao tung chuc nang (dang bai, binh luan, chat...), ta chan ngay tai lop xac thuc de user bi ban khong the su dung he thong.

### 1. Cap nhat `LawOfLightGuard.tsx` - Kiem tra ban khi co session
Khi user dang nhap hoac co session, truy van `is_banned` tu `profiles`. Neu `is_banned = true`:
- Goi `supabase.auth.signOut()` de dang xuat
- Hien thi thong bao "Tai khoan da bi cam vinh vien"
- Chuyen huong ve trang `/law-of-light`

### 2. Cap nhat `SocialLogin.tsx` / `Auth.tsx` - Chan dang nhap
Sau khi dang nhap thanh cong (`SIGNED_IN`), kiem tra `is_banned`. Neu bi ban:
- Sign out ngay lap tuc
- Hien thi toast "Tai khoan cua ban da bi cam vinh vien. Vui long lien he admin."

### 3. Cap nhat Edge Function `create-post` - Chan phia server
Them kiem tra `is_banned` sau khi xac thuc user (dong 104). Neu bi ban tra ve loi 403. Day la lop bao ve thu 2 phong truong hop client bi bypass.

### 4. Cap nhat Edge Function `record-donation` - Chan phia server  
Tuong tu, them kiem tra `is_banned` de chan user bi ban gui tien/tang qua.

## Chi tiet ky thuat

### LawOfLightGuard.tsx (thay doi chinh)
Trong ham `checkLawOfLightAcceptance`, sau khi lay profile:
```text
profiles.select('law_of_light_accepted, is_banned')
  |
  v
Neu is_banned = true:
  -> supabase.auth.signOut()
  -> Hien thi trang "Tai khoan da bi cam"
  -> Khong cho vao bat ky trang nao
```

### Auth.tsx / SocialLogin.tsx
Trong `onAuthStateChange` khi `SIGNED_IN`:
```text
Query profiles.is_banned
  |
  v
Neu true -> signOut() + toast error
```

### create-post Edge Function
Sau dong 104 (`const userId = user.id`):
```text
Query profiles.is_banned where id = userId
  |
  v  
Neu true -> return 403 "Tai khoan da bi cam"
```

## Ket qua
- User bi ban: Bi dang xuat, khong the dang nhap lai, khong the thuc hien bat ky hanh dong nao
- Lich su: Bai viet, binh luan, giao dich van con trong database de admin kiem toan
- Bao ve 2 lop: Frontend (LawOfLightGuard) + Backend (Edge Functions)

