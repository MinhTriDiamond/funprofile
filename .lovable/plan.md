

# Mở khóa 12 user on_hold

## Danh sách 12 user sẽ được mở khóa

| # | Username | Tên | Posts | Comments |
|---|----------|-----|-------|----------|
| 1 | UtopiaThuy413 | Hoàng Thị Thùy | 2,623 | 1,429 |
| 2 | nguyenthu688 | Nguyễn Thị Thu | 325 | 345 |
| 3 | ngo_phuc | Ngô Thị Hồng Phúc | 256 | 386 |
| 4 | angelbachviet | Đinh Phạm Bách Việt | 150 | 4 |
| 5 | xuannhan413 | Xuân Nhân | 112 | 11 |
| 6 | baoan413 | Nguyễn Hoàng Bảo Ân | 107 | 51 |
| 7 | nhuvinh | Trần Như Vinh | 91 | 4 |
| 8 | khoa_ngo | Ngô Khoa | 79 | 125 |
| 9 | thientam369 | Thiện Tâm | 61 | 39 |
| 10 | minhvui | Nguyễn Minh Vui | 59 | 8 |
| 11 | duonghoa | Dương Thị Hoà | 54 | 20 |
| 12 | lequyen | Hoàng Lệ Quyên | 14 | 12 |

**Giữ nguyên ban**: User `Xuan` (Nguyen Huu Xuan) -- để kiểm tra thêm.

## Thực hiện

Chạy một lệnh UPDATE duy nhất chuyển `reward_status` từ `on_hold` sang `approved` cho 12 user ID đã xác nhận:

```sql
UPDATE profiles
SET reward_status = 'approved'
WHERE id IN (
  '0fd954f5-5d1f-48bf-aab5-0152232aee6c',
  'b99b60c0-1a08-41a5-8627-7e48eb564c22',
  '72d80e2d-e5e9-4d6e-bdaf-77b3608cf199',
  '49a1eb82-7522-4efc-aac2-ff9470e7bb41',
  '518558fa-8e49-4da4-a3fc-32b2a80479bc',
  '78b02e1f-095f-4c08-88b9-8689acfaa38f',
  '8251ab62-ac29-409c-b4aa-93f8c7c24c77',
  'db1109de-c8b9-40b7-bd2e-de98b809045a',
  '3fb36553-6cb7-4831-8b42-c460fb70394d',
  'b976b131-6810-4c52-ad63-e013e8645e2a',
  '28fc14e9-534b-4b47-949d-24d4e3800a19',
  'd1b92695-ee22-464c-b8ed-ee2d96b35bb0'
)
AND is_banned = false
AND reward_status = 'on_hold';
```

Không cần thay đổi code. Chỉ cần chạy lệnh UPDATE trên database.

