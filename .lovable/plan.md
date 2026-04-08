

## Sửa lỗi Facebook hiển thị giao diện cũ + giữ nhạc tự phát

### Vấn đề
Trình duyệt in-app của Facebook cache phiên bản cũ có nhạc Tết và giao diện chọn hình nền. Code hiện tại đã đúng (dùng `light-economy-anthem.mp3`) nhưng Facebook không tải bản mới.

### Thay đổi

**1. `index.html` — Thêm cache-control meta tags**
- Thêm `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0` vào `<head>`
- Buộc trình duyệt Facebook tải phiên bản mới nhất

**2. Xóa file nhạc cũ không dùng**
- Xóa `public/sounds/tet.mp3`
- Xóa `public/sounds/valentine.mp3`
- Tránh trường hợp cache cũ vẫn tải được file nhạc Tết

**3. Giữ nguyên nhạc tự phát**
- Không thay đổi `globalAudio.ts` và `GlobalAudioBootstrap` — nhạc `light-economy-anthem.mp3` vẫn tự phát khi user tương tác đầu tiên

