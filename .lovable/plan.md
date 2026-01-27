

# Kế Hoạch Sửa Lỗi Video Player "An unknown error occurred"

## Vấn Đề Hiện Tại

Video vừa upload lên (2 phút trước) hiển thị lỗi "An unknown error occurred" trong player vì Cloudflare Stream vẫn đang encode video. Đặc biệt với video dài 9 tiếng (~10GB), thời gian xử lý có thể mất 10-30 phút.

## Nguyên Nhân Gốc

1. **StreamPlayer hiện tại sử dụng iframe** của Cloudflare và không thể bắt lỗi hiển thị bên trong iframe
2. **Thiếu cơ chế kiểm tra `readyToStream`** trước khi cố gắng phát video
3. **Không có polling** để tự động refresh khi video đã sẵn sàng

## Giải Pháp

### Bước 1: Cập nhật StreamPlayer.tsx

Thêm logic kiểm tra trạng thái video trước khi phát:

- Extract video UID từ URL
- Gọi API `check-status` để kiểm tra `readyToStream`
- Nếu video chưa sẵn sàng: hiển thị UI "Đang xử lý video" với tiến độ
- Polling mỗi 5 giây để kiểm tra khi nào video sẵn sàng
- Khi video sẵn sàng, tự động hiển thị player

### Bước 2: Thêm Component VideoProcessingState

Tạo UI thân thiện khi video đang được xử lý:

- Hiển thị thumbnail (nếu có)
- Icon loading với animation
- Thông báo "Video đang được xử lý..."
- Hiển thị tiến độ encoding (nếu có từ Cloudflare API)
- Ước tính thời gian còn lại

### Bước 3: Cập nhật LazyVideo.tsx

- Thêm prop `checkStatus` để enable/disable việc kiểm tra trạng thái
- Truyền callback để xử lý khi video chuyển từ "đang xử lý" sang "sẵn sàng"

## Chi Tiết Kỹ Thuật

### File cần sửa đổi:

1. **src/components/ui/StreamPlayer.tsx**
   - Thêm state `isVideoReady` và `processingProgress`
   - Thêm useEffect để poll trạng thái video khi chưa sẵn sàng
   - Thêm UI cho trạng thái "Đang xử lý"

2. **src/utils/streamUpload.ts**
   - Export hàm `checkVideoStatus` để sử dụng ở frontend
   - Thêm hàm `extractStreamUid` để extract UID từ URL

3. **src/components/ui/LazyVideo.tsx**
   - Truyền prop mới vào StreamPlayer

### Logic xử lý mới trong StreamPlayer:

```text
┌─────────────────────────────────────────────────────────┐
│                    Video Load Flow                       │
├─────────────────────────────────────────────────────────┤
│  1. Extract UID từ video URL                            │
│              ↓                                          │
│  2. Gọi API check-status                                │
│              ↓                                          │
│  3. Nếu readyToStream = true                            │
│     → Hiển thị iframe player bình thường                │
│              ↓                                          │
│  4. Nếu readyToStream = false                           │
│     → Hiển thị UI "Đang xử lý video"                    │
│     → Bắt đầu polling mỗi 5 giây                        │
│              ↓                                          │
│  5. Khi video sẵn sàng                                  │
│     → Tự động refresh và hiển thị player                │
└─────────────────────────────────────────────────────────┘
```

### UI "Đang xử lý video":

- Background: Thumbnail video (nếu có) với overlay mờ
- Centered: Icon Loader2 với animation spin
- Text chính: "Đang xử lý video..."
- Text phụ: "Video siêu dài đang được mã hóa, vui lòng đợi"
- Optional: Progress bar nếu có thông tin từ Cloudflare

## Lợi Ích

1. **UX tốt hơn**: Người dùng thấy thông báo thân thiện thay vì lỗi
2. **Tự động refresh**: Không cần F5 trang khi video đã sẵn sàng
3. **Thông tin rõ ràng**: Người dùng biết video đang được xử lý, không phải lỗi hệ thống
4. **Hỗ trợ video siêu dài**: Đặc biệt quan trọng cho video 9-10 tiếng

## Thời Gian Ước Tính

- Cập nhật StreamPlayer.tsx: Thêm logic polling và UI processing
- Cập nhật LazyVideo.tsx: Truyền props mới
- Test: Verify với video đang processing

