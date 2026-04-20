

## Cập nhật ngôn xưng trong thông báo reset epoch tháng 4

### Thay đổi
Đổi xưng hô **"Cha/Mẹ"** → **"bạn"** trong toàn bộ nội dung notification gửi cho user khi reset epoch tháng 4/2026.

### Nội dung notification mới

> **Tiêu đề**: 🌸 Phân bổ FUN tháng 4 sẽ chờ hết chu kỳ nhé bạn ơi
>
> **Nội dung**: *"Để đảm bảo công bằng cho tất cả thành viên trong gia đình FUN, phân bổ FUN Money của tháng 4/2026 sẽ chính thức mở vào ngày 01/05/2026 — sau khi chu kỳ kết thúc trọn vẹn. Mọi điểm sáng (Light Score) bạn tích lũy đến cuối tháng đều được tính đầy đủ nha! 💛 Hẹn gặp lại vào đầu tháng 5 với phần quà xứng đáng nhất."*

### Phạm vi áp dụng
- Chỉ thay đổi ở **notification body** trong migration SQL của Bước 3 (insert `notifications` batch).
- Các phần khác của plan (rollback data, ẩn epoch, banner UI) **giữ nguyên** như đã thống nhất.

### Các bước triển khai (giữ nguyên thứ tự cũ)
1. Migration SQL: hủy mint requests tháng 4 chưa lên chain, xóa allocation pending, đưa epoch về `open`.
2. Ẩn epoch tháng 4 khỏi `ClaimRewardsCard` + `PplpMintTab` (gate `epoch_date + 1 month <= now()`).
3. Insert notifications hàng loạt với nội dung **đã cập nhật xưng hô "bạn"** ở trên.
4. Banner UI trên ClaimRewardsCard: *"Chu kỳ tháng 4/2026 đang diễn ra — phân bổ FUN sẽ mở vào ngày 01/05/2026 nhé! 🌙"*
5. QA: verify số request/allocation = 0, notification gửi đúng số user.

