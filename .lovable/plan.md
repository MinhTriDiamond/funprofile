
# Kiem tra va khac phuc hien thi trang thai ban

## Phan tich
Sau khi kiem tra ky, code da duoc cap nhat dung:
- View `public_profiles` da co cot `is_banned` trong database
- `luuquangtrung` co `is_banned = true` trong database
- `useFeedPosts.ts` da loc bai viet cua user bi ban
- `Profile.tsx` da hien thi badge "Da bi cam"
- Import `Badge` component da co

Tuy nhien, co 1 van de tiem an: Khi admin xem profile cua chinh minh (own profile), query su dung `profiles.select('*')` va TypeScript type co `is_banned`. Nhung khi nguoi khac xem profile cua user bi ban, query su dung `public_profiles` voi `is_banned` — code nay dung.

**Nguyen nhan co the**: Trang web dang cache phien ban cu. Can lam moi trang (Ctrl+Shift+R) de thay thay doi.

## Hanh dong
1. Thu lam moi trang cung (hard refresh) bang Ctrl+Shift+R
2. Neu van khong thay doi, kiem tra console log de xac dinh loi cu the
3. Them console.log tam thoi vao `Profile.tsx` de debug gia tri `is_banned` dang nhan duoc tu database

## Thay doi ky thuat (neu can)
Neu hard refresh khong giai quyet, se them logic dam bao:
- Trong `Profile.tsx`, them log debug cho gia tri `profile?.is_banned` 
- Dam bao React Query khong cache du lieu cu qua lau bang cach giam `staleTime`
