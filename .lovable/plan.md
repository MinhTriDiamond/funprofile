

# Cấp Quyền Admin Cho 3 User

## Thông Tin User

| Email | User ID | Role hiện tại |
|-------|---------|---------------|
| nguyenaivan10389@gmail.com | 5f9de7c5-0c80-49aa-8e1c-92d8058558e4 | user |
| hoangtydo88@gmail.com | a39d467c-58b7-4347-9932-59a19eadf503 | user |
| daothianhnguyet.pt@gmail.com | ac174b69-1a24-4a9a-bf74-e448b9a754cf | user |

## Thay Doi

Chay 1 migration INSERT them role `admin` vao bang `user_roles` cho 3 user tren. Role `user` hien tai van giu nguyen, chi them role `admin` moi.

```text
user_roles (hien tai)          user_roles (sau khi cap nhat)
+----------+------+            +----------+------+
| user_id  | role |            | user_id  | role |
+----------+------+            +----------+------+
| 5f9de... | user |            | 5f9de... | user |
| a39d4... | user |   --->     | 5f9de... | admin|  (MOI)
| ac174... | user |            | a39d4... | user |
+----------+------+            | a39d4... | admin|  (MOI)
                               | ac174... | user |
                               | ac174... | admin|  (MOI)
                               +----------+------+
```

## SQL Migration

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('5f9de7c5-0c80-49aa-8e1c-92d8058558e4', 'admin'),
  ('a39d467c-58b7-4347-9932-59a19eadf503', 'admin'),
  ('ac174b69-1a24-4a9a-bf74-e448b9a754cf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

`ON CONFLICT DO NOTHING` dam bao an toan -- neu ai da co role `admin` thi khong loi.

## Ket Qua

Sau khi chay, ca 3 user se:
- Thay duoc nut **Admin Dashboard** tren sidebar trai
- Truy cap duoc trang `/admin` voi day du quyen quan tri
- Van giu role `user` binh thuong

## Danh Sach Files

| File | Hanh dong |
|------|-----------|
| Migration SQL | **Tao moi** -- INSERT 3 dong admin role |

Khong can thay doi code -- he thong da co san logic kiem tra admin role qua ham `has_role`.

