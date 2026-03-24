
## Hiển thị popup thông báo điều chỉnh CAMLY ngay khi user mở fun.rich

### Mục tiêu
Khi user mở trang, nếu có thông báo `reward_adjustment` chưa đọc thì hiện popup nổi ngay giống kiểu thông báo quà, nội dung ghi rõ lý do bị trừ CAMLY, có nút `X` để tắt.

### Những gì con đã rà
- Backend hiện đã có dữ liệu `reward_adjustment` và policy đọc thông báo của chính user là đúng.
- UI hiện chỉ hiển thị `reward_adjustment` trong:
  - chuông thông báo (`NotificationDropdown`)
  - trang `/notifications`
- Chưa có component toàn cục nào tự bật popup cho `reward_adjustment` lúc vào app.
- Hệ thống popup toàn cục tương tự đã có sẵn cho quà tặng: `DonationReceivedNotification`, đang được mount trong `src/App.tsx`.

### Nguyên nhân user không “thấy ngay”
Thông báo điều chỉnh hiện chỉ nằm trong danh sách thông báo. Nếu user không mở chuông hoặc vào trang thông báo thì sẽ không thấy. Ngoài ra luồng realtime chỉ bắt sự kiện mới, còn các thông báo đã được tạo trước đó sẽ không tự bật popup khi mở lại trang.

### Kế hoạch triển khai

#### 1. Tạo popup toàn cục cho `reward_adjustment`
Tạo một component mới theo pattern của `DonationReceivedNotification`, ví dụ:
- `src/components/notifications/RewardAdjustmentNotification.tsx`

Component này sẽ:
- chạy khi user đã đăng nhập
- fetch thông báo `reward_adjustment` chưa đọc mới nhất của user lúc app mở
- hiển thị popup/modal nổi với:
  - tiêu đề yêu thương
  - nội dung lấy từ `metadata.message`
  - thông tin phụ nếu có: `reason`, `amount`, `gift_count`, `post_count`
  - nút đi tới ví
  - nút `X` để đóng

#### 2. Cho popup tự bắt cả trường hợp mới và trường hợp đã tồn tại
Component sẽ có 2 luồng:
- **On mount**: query unread `reward_adjustment` để user mở app ra là thấy luôn
- **Realtime INSERT**: nếu sau này có thêm thông báo điều chỉnh mới thì popup cũng bật ngay

Như vậy sẽ bao phủ cả:
- thông báo đã tạo từ trước
- thông báo vừa được gửi mới

#### 3. Quy định hành vi nút `X`
Khi user bấm `X`:
- chỉ đóng popup ngay để tránh làm phiền
- không xoá thông báo khỏi hệ thống
- thông báo vẫn còn trong chuông/trang thông báo
- để tránh bật lại liên tục trong cùng phiên mở app, lưu danh sách notification id đã tắt trong state hoặc session storage

#### 4. Quy định hành vi khi user bấm xem chi tiết
Khi user bấm CTA chính:
- đánh dấu thông báo là đã đọc
- điều hướng tới `/wallet`

Nếu có nhiều thông báo điều chỉnh chưa đọc:
- ưu tiên hiện cái mới nhất trước
- có thể xếp hàng lần lượt sau khi đóng cái trước, hoặc đơn giản hơn là chỉ hiện 1 cái mới nhất mỗi phiên
- em sẽ chọn hướng “1 cái mới nhất mỗi phiên” để nhẹ, dễ hiểu, không dồn popup

#### 5. Gắn component vào app toàn cục
Cập nhật `src/App.tsx` để mount popup mới cạnh `DonationReceivedNotification`, đảm bảo user ở bất kỳ route nào trong app cũng thấy được.

### File dự kiến thay đổi
- `src/App.tsx`
- `src/components/notifications/RewardAdjustmentNotification.tsx` (mới)
- Có thể thêm 1 component UI phụ nếu cần, ví dụ card/dialog riêng cho popup

### Chi tiết kỹ thuật
```text
App load
  -> user logged in
  -> fetch newest unread reward_adjustment
  -> if found:
       show popup
       X = dismiss popup only
       CTA = mark read + navigate /wallet

Realtime insert
  -> if new reward_adjustment for current user
  -> show popup immediately
```

### Lưu ý nội dung hiển thị
Popup sẽ ưu tiên dùng đúng `metadata.message` đã ghi rất cụ thể:
- bị trừ do gift
- bị trừ do bài ngắn / trùng lặp / không đủ điều kiện
- hoặc lý do khác về sau

Tức là không gom chung mơ hồ nữa; hệ thống sẽ hiển thị đúng lý do đã lưu trong từng thông báo.

### Kết quả mong đợi
- User mở fun.rich là thấy popup điều chỉnh CAMLY ngay
- Nội dung nói rõ nguyên nhân bị trừ
- Có nút `X` để tắt
- Vẫn giữ thông báo trong chuông để tra cứu lại sau
- Đồng bộ với kiểu popup quà tặng đang có sẵn
