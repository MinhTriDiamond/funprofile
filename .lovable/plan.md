
Mình đã rà lại code và tách đúng lỗi hiện tại:

### Vấn đề thực sự
`copyToClipboard` đã được dùng đúng ở `ProfileHeader` và `ReceiveTab`, nên lỗi bây giờ không còn nằm ở clipboard API nữa.

Với triệu chứng con mô tả:
- chỉ hỏng ở `Link hồ sơ` và `Mã ví hồ sơ`
- bấm trên điện thoại thì `không có gì`

thì nguyên nhân nhiều khả năng là **tap không chạm được vào nút copy**, vì vùng `AvatarOrbit` đang phủ lên khu vực thông tin hồ sơ trên mobile. Orbit này dùng wrapper rất lớn (`486px`), `overflow: visible`, `z-index` cao, nên dù nhìn không thấy, nó vẫn có thể chặn tap vào link ví và link hồ sơ.

### File cần chỉnh
1. `src/components/profile/AvatarOrbit.tsx`
2. `src/components/profile/ProfileHeader.tsx`

### Kế hoạch sửa
1. **Chặn AvatarOrbit bắt sự kiện ngoài vùng thật sự cần bấm**
   - đặt `pointer-events: none` cho các wrapper/layer trang trí của orbit
   - chỉ bật lại `pointer-events: auto` cho các phần thật sự tương tác được:
     - social icon button/link
     - nút `+`
     - popup edit / picker khi mở

2. **Ưu tiên vùng thông tin hồ sơ trên mobile**
   - bọc khối tên, link hồ sơ, ví trong một container có `relative` + `z-index` cao hơn orbit
   - nếu cần, tách riêng z-index mobile để chắc chắn tap luôn vào đúng nút copy

3. **Giữ nguyên logic copy hiện có**
   - không đổi `copyToClipboard`
   - không đổi toast/message
   - chỉ sửa lớp layout/pointer để `onClick` thật sự chạy được

4. **Kiểm tra lại toàn bộ điểm copy liên quan hồ sơ**
   - link `fun.rich/{username}`
   - nút ví ở header profile
   - tab Receive vẫn giữ fallback như hiện tại

### Kết quả mong đợi
- trên điện thoại, bấm `fun.rich/...` sẽ hiện toast và copy được
- bấm nút ví ở header sẽ hiện toast và copy được
- các icon orbit vẫn dùng bình thường, không bị hỏng

### Chi tiết kỹ thuật
Hiện `AvatarOrbit` có:
- wrapper lớn hơn avatar rất nhiều
- `overflow: visible`
- nhiều layer absolute với `z-index` cao

Đây là mẫu rất dễ tạo ra “overlay vô hình” chặn tap trên mobile. Vì vậy hướng sửa đúng là:
- để container trang trí **không nhận pointer events**
- chỉ cho phép pointer events trên đúng các phần tương tác
- đồng thời nâng stacking context của khối info/profile actions để tránh bị đè

### Test sau khi làm
- test trên mobile viewport ở trang `/:username`
- bấm copy link hồ sơ
- bấm copy mã ví hồ sơ
- xác nhận có toast và paste ra đúng giá trị
- kiểm tra icon orbit vẫn mở link/chỉnh sửa được nếu chạm vào đúng icon
