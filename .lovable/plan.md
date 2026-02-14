

## Fix: Nhạc tự động hát lại và chồng lên nhau khi chuyển trang

### Nguyên nhân gốc

Có 2 vấn đề chính:

1. **Nhạc chồng lên nhau**: Khi chuyển trang, component `ValentineMusicButton` bị unmount rồi mount lại. Mỗi lần mount tạo một `new Audio()` mới, nhưng audio cũ vẫn đang phát -> nhiều audio chạy cùng lúc.

2. **Nhạc tự hát lại**: Ref `autoplayAttempted` reset về `false` mỗi lần component mount lại, nên autoplay chạy lại mỗi khi chuyển trang - kể cả khi user đã bấm dừng.

### Giải pháp

Chuyển audio instance và trạng thái play/pause ra ngoài component (singleton pattern). Khi user bấm dừng, lưu lại trạng thái đó. Khi component mount lại (chuyển trang), đọc trạng thái đã lưu thay vì autoplay lại.

### Chi tiết thay đổi

**File: `src/components/layout/ValentineMusicButton.tsx`**

1. Khai báo biến ngoài component (module-level singleton):
   - `globalAudio`: Audio instance duy nhất, dùng chung cho mọi lần mount
   - `globalIsPlaying`: trạng thái đang phát hay không
   - `globalVolume`: âm lượng hiện tại
   - `globalAutoplayDone`: đánh dấu autoplay đã thử 1 lần duy nhất (không reset khi remount)
   - `globalUserStopped`: khi user bấm dừng, đặt `true` -> không bao giờ autoplay lại

2. Hàm `ensureAudio()` chỉ tạo audio nếu `globalAudio` chưa có (tránh tạo nhiều instance)

3. Autoplay effect:
   - Chỉ chạy nếu `globalAutoplayDone === false` VÀ `globalUserStopped === false`
   - Sau khi chạy, đặt `globalAutoplayDone = true`

4. Hàm `toggle()`:
   - Khi user bấm dừng: đặt `globalUserStopped = true`, pause audio
   - Khi user bấm hát: đặt `globalUserStopped = false`, play audio

5. Bỏ cleanup audio khi unmount (vì audio là singleton, không cần tạo lại)

6. Component mount lại: đọc `globalIsPlaying` để sync UI state, không autoplay lại

### Kết quả mong đợi

- Vào trang lần đầu: nhạc tự động phát
- User bấm dừng: nhạc dừng
- Chuyển sang trang khác: nhạc KHÔNG tự hát lại, không chồng lên
- User bấm hát lại: nhạc phát bình thường
- Chỉ có 1 audio instance duy nhất trong toàn bộ app

