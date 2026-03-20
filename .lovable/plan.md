

## Thêm bảng thành viên mới mỗi ngày khi nhấn "Tổng Thành Viên"

### Mô tả
Khi user nhấn vào mục "Tổng Thành Viên" trong Honor Board, hiện modal hiển thị bảng thống kê số thành viên mới đăng ký theo từng ngày (14 ngày gần nhất), theo múi giờ Việt Nam.

### Thay đổi

**1. Tạo file `src/components/feed/NewMembersModal.tsx`**
- Modal dialog tương tự `ClaimHistoryModal` (cùng style)
- Query `profiles` table, group by ngày (VN timezone) để lấy số thành viên mới mỗi ngày
- Hiển thị bảng: Ngày | Số thành viên mới | Tổng cộng dồn
- Có thanh cuộn `overflow-y-auto` cho danh sách
- Dòng hôm nay highlight nổi bật

**2. Sửa `src/components/feed/AppHonorBoard.tsx`**
- Thêm state `showNewMembers` + import `NewMembersModal`
- Khi click vào mục "Tổng Thành Viên", mở modal `NewMembersModal`
- Thêm `<NewMembersModal open={showNewMembers} onOpenChange={setShowNewMembers} />`

### Dữ liệu
Query trực tiếp từ `profiles` table:
```sql
SELECT DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as signup_date, 
       COUNT(*) as new_users 
FROM profiles 
GROUP BY signup_date 
ORDER BY signup_date DESC 
LIMIT 30
```

### UI Modal
- Header: "Thành viên mới mỗi ngày" với icon Users
- Bảng 2 cột: **Ngày** (format dd/MM/yyyy) | **Thành viên mới** (số)
- Dòng hôm nay có background highlight xanh
- Style phù hợp với theme hiện tại (dark/light)

