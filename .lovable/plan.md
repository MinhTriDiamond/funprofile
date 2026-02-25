

# Sửa lỗi: Nút "Tải về" hiển thị nội dung manifest.json thay vì tải video

## Nguyên nhân

Nút "Tải về" trong feed và gallery viewer sử dụng thẻ `<a href={item.url} download>`. Với video chunked recording, `item.url` trỏ đến file `manifest.json`. Khi click, trình duyệt mở URL này và hiển thị nội dung JSON (danh sách chunks) thay vì tải video.

Screenshot cho thấy đúng nội dung manifest.json với hàng trăm chunks được hiển thị trên màn hình.

## Giải pháp

Thay nút `<a>` download bằng nút `<button>` có logic:
1. Detect nếu URL là manifest.json (chunked recording)
2. Fetch manifest, tải tất cả chunks, gộp thành 1 blob video
3. Tạo blob URL và trigger download file `.webm`
4. Hiển thị progress khi đang tải

Với video thường (không phải manifest), giữ nguyên hành vi download trực tiếp.

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/feed/MediaGrid.tsx` | Thay 2 nút `<a download>` (dòng 83-93 và 363-372) bằng button gọi hàm `handleChunkedDownload`. Thêm hàm download logic: fetch manifest → fetch chunks → concat blob → trigger download. Hiển thị trạng thái downloading. |

## Chi tiết kỹ thuật

Tạo hàm `downloadChunkedVideo(manifestUrl)` trong `MediaGrid.tsx`:

```text
1. Fetch manifest.json → parse JSON
2. Lặp qua từng chunk, fetch blob
3. Concat tất cả blobs thành 1 Blob({ type: mime_type })
4. Tạo Object URL → tạo thẻ <a> ẩn → click() → revoke URL
5. Hiển thị toast/spinner khi đang tải
```

Cả 2 vị trí download button (feed single video + gallery viewer) đều cần cập nhật:
- Dòng 83-93: Nút download trên video đơn trong feed
- Dòng 363-372: Nút download trong gallery fullscreen viewer

