

## Tự động phát nhạc khi mở trang

### Vấn đề
Hiện tại nhạc chỉ phát khi user bấm nút. User muốn nhạc **tự động phát** khi vào trang.

### Lưu ý kỹ thuật
Trình duyệt hiện đại **chặn autoplay có âm thanh**. Giải pháp: lắng nghe sự kiện tương tác đầu tiên (click/touch/keydown) rồi tự động phát nhạc ngay lập tức.

### Thay đổi

**`src/lib/globalAudio.ts`**
- Thêm hàm `autoplay()` — đăng ký listener cho sự kiện tương tác đầu tiên của user (`click`, `touchstart`, `keydown`) trên `document`
- Khi phát hiện tương tác đầu tiên → gọi `play()` ngay, sau đó gỡ listener (chỉ chạy 1 lần)
- Gọi `autoplay()` ngay khi module được import lần đầu (tự kích hoạt)

### Kết quả
- User vào trang → click/chạm bất kỳ đâu → nhạc tự động phát
- Muốn tắt/giảm âm lượng → dùng nút nhạc như bình thường
- Không cần sửa component nào khác

