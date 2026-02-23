

# Thêm Progress Bar Upload Thật Cho Video Livestream

## Vấn đề hiện tại

UI đã hiển thị progress bar khi upload video, nhưng phần trăm là **giả** - nhảy từ 10% -> 30% -> 100%. Lý do: hàm `uploadWithPresignedUrl` dùng `fetch()` API, không hỗ trợ theo dõi tiến trình upload thật.

## Giải pháp

Thay `fetch()` bằng `XMLHttpRequest` trong hàm upload presigned URL, vì XHR hỗ trợ event `upload.onprogress` để theo dõi phần trăm upload thật.

## Chi tiết kỹ thuật

### 1. File sửa: `src/utils/r2Upload.ts`

**Thay đổi hàm `uploadWithPresignedUrl`**:
- Thêm tham số `onProgress?: (percent: number) => void`
- Thay `fetch()` bằng `XMLHttpRequest` để theo dõi `upload.onprogress`
- Giữ nguyên timeout và error handling

**Thay đổi hàm `uploadToR2`**:
- Thêm tham số `onProgress?: (percent: number) => void` 
- Truyền `onProgress` xuống `uploadWithPresignedUrl`

### 2. File sửa: `src/modules/live/liveService.ts`

**Thay đổi hàm `uploadLiveRecording`**:
- Truyền `onProgress` callback trực tiếp xuống `uploadToR2` thay vì gọi giả `onProgress(10)`, `onProgress(30)`, `onProgress(100)`

### 3. Không thay đổi `LiveHostPage.tsx`

UI progress bar đã có sẵn và hoạt động đúng - chỉ cần dữ liệu progress thật từ upload.

## Kết quả

- Progress bar sẽ hiển thị phần trăm upload **thật** dựa trên bytes đã gửi
- Áp dụng cho tất cả upload qua `uploadToR2` (nếu truyền `onProgress`)
- Không ảnh hưởng các chỗ khác đang dùng `uploadToR2` mà không truyền `onProgress`
