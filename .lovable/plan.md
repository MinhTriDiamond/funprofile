

# Thêm Picture-in-Picture (PiP) cho FacebookVideoPlayer

## Thay đổi

### `src/components/ui/FacebookVideoPlayer.tsx`

1. **Import thêm icon `PictureInPicture2`** từ `lucide-react`
2. **Thêm state `pip`** để track trạng thái PiP
3. **Thêm hàm `togglePip`**: gọi `video.requestPictureInPicture()` hoặc `document.exitPictureInPicture()`
4. **Thêm useEffect** lắng nghe sự kiện `enterpictureinpicture` và `leavepictureinpicture` trên video element để đồng bộ state
5. **Thêm keyboard shortcut** phím `p`/`P` để toggle PiP
6. **Thêm nút PiP** vào button row (non-compact), đặt trước nút Fullscreen
7. **Thêm nút PiP nhỏ** cho compact mode (cạnh nút Mute)

