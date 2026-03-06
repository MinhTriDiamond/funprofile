

## Phân tích 8 user còn lại trong bảng duyệt thưởng

### Nguyên nhân

8 user này vẫn còn `reward_status = 'pending'` vì **migration cleanup chỉ lọc user thiếu điều kiện cơ bản** (avatar/cover/tên/ví). Cả 8 user này đều đã có đầy đủ avatar, cover, tên, ví → nên KHÔNG bị chuyển sang `inactive`.

Tuy nhiên, **không ai trong số họ chủ động nhấn nút "Yêu cầu duyệt"** — trạng thái `pending` là từ giá trị mặc định cũ khi đăng ký.

### Chi tiết 8 user

| Username | Tạo lúc | Avatar | Cover | Tên | Ví | Tuổi TK |
|---|---|---|---|---|---|---|
| mai60hd | 06/03 | ✅ | ✅ | ✅ | ✅ | < 1 ngày |
| thuongnguyen369 | 06/03 | ✅ | ✅ | ✅ | ✅ | < 1 ngày |
| binhtran568 | 06/03 | ✅ | ✅ | ✅ | ✅ | < 1 ngày |
| chung6879hp6s0543 | 06/03 | ✅ | ✅ | ✅ | ✅ | < 1 ngày |
| yenhanhphuc | 06/03 | ✅ | ✅ | ✅ | ✅ | < 1 ngày |
| nggngocnhi204 | 05/03 | ✅ | ✅ | ✅ | ✅ | 1 ngày |
| hoannguyenkimhnvn65 | 05/03 | ✅ | ✅ | ✅ | ✅ | 1 ngày |
| loan01111956 | 05/03 | ✅ | ✅ | ✅ | ✅ | 1 ngày |

**Vấn đề chung:** Tất cả đều có tuổi tài khoản < 7 ngày → chưa đủ điều kiện claim dù admin có duyệt.

### Giải pháp

Chạy **1 SQL update** để chuyển tất cả user `pending` còn lại về `inactive`, vì hệ thống mới đã có nút "Yêu cầu duyệt" — khi nào đủ điều kiện (bao gồm ≥ 7 ngày), user sẽ tự nhấn nút gửi yêu cầu.

```sql
UPDATE profiles 
SET reward_status = 'inactive' 
WHERE reward_status = 'pending';
```

Không cần sửa code — chỉ cần 1 lệnh SQL data cleanup.

