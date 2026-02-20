
## Khoi phuc quyen Admin cho angelaivan

### Van de
Tai khoan `angelaivan` (ID: `5f9de7c5-0c80-49aa-8e1c-92d8058558e4`) khong co ban ghi nao trong bang `user_roles`. Quyen admin da bi xoa hoac mat, nen muc "Admin" khong hien thi trong menu dropdown tren thanh dieu huong.

### Giai phap
Them lai ban ghi admin vao bang `user_roles` bang cau lenh SQL:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('5f9de7c5-0c80-49aa-8e1c-92d8058558e4', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Ket qua
Sau khi thuc hien, tai khoan `angelaivan` se thay lai nut Admin trong:
- Menu dropdown (avatar) tren thanh dieu huong desktop
- Trang ca nhan (Profile page)
