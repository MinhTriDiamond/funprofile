
# Fix: Video Live Replay không phát được trong Feed

## Phạm vi ảnh hưởng
Lỗi chung — ảnh hưởng TẤT CẢ phiên livestream đã kết thúc, không riêng 3 user.

## Nguyên nhân
Feed dùng thẻ `<video>` HTML cho mọi video URL. URL replay là file `manifest.json` (chứa danh sách các đoạn video) — thẻ `<video>` không đọc được JSON nên hiện màn đen/lỗi.

Gallery viewer (popup phóng to) đã xử lý đúng bằng `ChunkedVideoPlayer`. Feed chính thì chưa.

## Thay đổi: 1 file duy nhất

**`src/components/feed/MediaGrid.tsx`**

Tại 5 vị trí render `<LazyVideo>` (single media, grid 2, grid 3 x2 vị trí, grid 4+), thêm kiểm tra:

```text
if isChunkedManifestUrl(url)
  -> render <ChunkedVideoPlayer> (wrapped in Suspense)
else
  -> render <LazyVideo> (giữ nguyên như cũ)
```

Hàm `isChunkedManifestUrl()` và component `ChunkedVideoPlayer` đã tồn tại trong codebase — chỉ cần dùng chúng ở đúng chỗ.

## Kết quả sau sửa
- Tất cả live replay trong feed sẽ phát được bình thường
- Video upload thường không bị ảnh hưởng
- Không cần xử lý lại dữ liệu cũ — manifest files trên storage vẫn hoạt động tốt
