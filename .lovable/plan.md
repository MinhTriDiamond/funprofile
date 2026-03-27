

## Cho phép user thường xem tổng thưởng từng người

### Vấn đề
Hiện tại khi user thường bấm vào "Tổng phần thưởng", hệ thống chặn hoàn toàn và hiện toast "Chỉ quản trị viên mới xem được chi tiết này". User không xem được gì cả.

### Thực tế code đã có sẵn
- `ContentStatsDateDetail.tsx` (dòng 163-164) **đã kiểm tra `isAdmin`** trước khi cho drill-down vào chi tiết từng bài của user → user thường **đã không thể** xem chi tiết từng bài rồi.
- Vấn đề chỉ nằm ở `AppHonorBoard.tsx` dòng 34-37 đang **chặn luôn cả việc mở modal**.

### Giải pháp
Chỉ cần sửa **1 file**: `src/components/feed/AppHonorBoard.tsx`

- Xoá điều kiện chặn admin-only cho rewards (dòng 34-37)
- Giữ nguyên logic trong `ContentStatsDateDetail` vì đã đúng: user thường xem được danh sách + tổng CAMLY mỗi người, nhưng không bấm vào xem chi tiết từng bài được

### Kết quả
- User thường: bấm Tổng phần thưởng → thấy danh sách user + tổng CAMLY mỗi người, **không drill-down** được
- Admin: bấm vào → thấy danh sách + bấm tiếp vào user để xem chi tiết từng bài

