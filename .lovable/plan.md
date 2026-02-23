

# Thu Gọn Thông Báo Gian Lận - Thêm Nút "Xem Chi Tiết"

## Vấn Đề
Thông báo báo cáo gian lận (`admin_fraud_daily`, `admin_shared_device`, `admin_email_farm`) hiển thị toàn bộ danh sách cảnh báo trực tiếp, làm nội dung rất dài và khó đọc.

## Giải Pháp
Hiển thị tóm tắt ngắn gọn (ví dụ: "7 cảnh báo - 3 TK đình chỉ"), kèm nút **"Xem chi tiết"** để mở rộng xem danh sách đầy đủ.

## Thay Đổi

### File: `src/pages/Notifications.tsx`

1. **Rút gọn nội dung hiển thị mặc định** cho các loại thông báo fraud:
   - `admin_fraud_daily`: Chỉ hiện "7 cảnh báo, 3 TK đình chỉ"
   - `admin_shared_device`: Chỉ hiện "Thiết bị xxx có 3 TK"
   - `admin_email_farm`: Chỉ hiện "Cụm email "abc" có 5 TK"

2. **Thêm state `expandedNotifications`** (Set) để theo dõi các thông báo đang mở rộng.

3. **Thêm nút "Xem chi tiết" / "Thu gọn"** bên dưới dòng tóm tắt. Khi bấm sẽ hiện danh sách đầy đủ (alerts, usernames, emails).

4. **Tách phần render** thông báo fraud thành một component con hoặc logic riêng trong cùng file, hiển thị:
   - Dòng tóm tắt (luôn hiện)
   - Nút toggle "Xem chi tiết" / "Thu gọn"
   - Danh sách chi tiết (chỉ hiện khi expanded), mỗi alert trên 1 dòng riêng cho dễ đọc

### Giao Diện Khi Thu Gọn
```
📊 Báo cáo gian lận: 7 cảnh báo, 3 TK đình chỉ
[Xem chi tiết ▼]
```

### Giao Diện Khi Mở Rộng
```
📊 Báo cáo gian lận: 7 cảnh báo, 3 TK đình chỉ
[Thu gọn ▲]
- Thiết bị dfb4ace9... có 3 TK: MINHCANH, @Binhan2024...
- Cụm email "tacongminh" có 3 TK: vulongt4, hoyeu, long
- Cụm email "congminhyvnh" có 18 TK: loannguyebn...
```

