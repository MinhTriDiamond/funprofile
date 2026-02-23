
# Kiểm Tra Chéo IP + Thiết Bị Để Tránh Nhầm Lẫn

## Vấn Đề

Hiện tại bước 3 (IP Clustering) trong `daily-fraud-scan` chỉ đếm số user trên cùng IP. Nếu >3 user cùng IP trong 24h thì tự động đình chỉ tất cả. Điều này gây **ban oan** trong các trường hợp:

- Quán cà phê / trường học / văn phòng: nhiều người dùng chung wifi nhưng **khác thiết bị** hoàn toàn
- Mạng di động (CGNAT): hàng trăm người chung 1 IP nhưng khác nhau hoàn toàn

Dữ liệu thực tế cho thấy: IP `175.141.176.174` có 10 user nhưng 7 thiết bị khác nhau -- có thể có người vô tội bị vạ lây.

## Giải Pháp: Kiểm Tra Chéo Đa Tầng

Thay đổi logic IP clustering để **kết hợp thêm dấu vân tay thiết bị** trước khi quyết định đình chỉ:

### Quy tắc mới

| Tình huống | Hành động |
|---|---|
| Cùng IP + Cùng thiết bị | Tự động đình chỉ (chắc chắn gian lận) |
| Cùng IP + Khác thiết bị hoàn toàn | Chỉ cảnh báo, KHÔNG tự động đình chỉ |
| Cùng IP + Một số chung thiết bị | Chỉ đình chỉ nhóm chung thiết bị, cảnh báo phần còn lại |

### Chi tiết kỹ thuật

**File sửa: `supabase/functions/daily-fraud-scan/index.ts`**

Cập nhật bước 3 (IP clustering) như sau:

1. Sau khi tìm được IP có >3 user, truy vấn thêm `pplp_device_registry` để lấy `device_hash` (v2+) của từng user
2. Phân nhóm:
   - **Nhóm A**: Các user chia sẻ cùng `device_hash` (fraud chắc chắn) -- tự động đình chỉ
   - **Nhóm B**: Các user có thiết bị riêng biệt (có thể hợp lệ) -- chỉ ghi cảnh báo, không đình chỉ
3. Cập nhật alert text để ghi rõ:
   - "IP x.x.x.x: 5 TK chung thiết bị (đã đình chỉ): user1, user2... | 3 TK thiết bị riêng (chỉ cảnh báo): user3, user4..."
4. Severity cũng được điều chỉnh:
   - Chung thiết bị: severity 4 (cao)
   - Chỉ chung IP: severity 2 (thấp, chỉ theo dõi)

Logic cụ thể:

```text
// Bước 3 mới: IP clustering + cross-check thiết bị
for mỗi IP có >3 users:
  1. Lấy device_hash (v2+) của tất cả user trong cụm IP
  2. Tạo map: device_hash -> [user_ids]
  3. Tìm device_hash nào có >1 user (= shared device within IP)
  4. sharedDeviceUsers = users chia sẻ thiết bị -> AUTO HOLD
  5. uniqueDeviceUsers = users có thiết bị riêng -> CHỈ CẢNH BÁO
  6. Nếu sharedDeviceUsers > 0: insert fraud signal severity 4, auto hold
  7. Nếu chỉ có uniqueDeviceUsers: insert fraud signal severity 2, KHÔNG hold
```

Thay đổi này giúp giảm thiểu tối đa việc đình chỉ nhầm user vô tội trong khi vẫn bắt được các trường hợp gian lận thực sự (cùng IP + cùng thiết bị).
