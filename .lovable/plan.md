

## Tự động cập nhật khi có phiên bản mới

### Ý tưởng
Tạo cơ chế kiểm tra phiên bản mới định kỳ. Khi phát hiện deploy mới, hiển thị toast thông báo cho user nhấn cập nhật (hoặc tự reload khi user chuyển trang).

### Cách hoạt động

```text
Build time: Vite ghi BUILD_ID vào biến env (đã có sẵn)
               ↓
Runtime:    Hook useVersionCheck() fetch /index.html mỗi 5 phút
               ↓
            So sánh script src hash trong HTML
               ↓
Khác nhau → Hiển thị toast "Có bản cập nhật mới"
               ↓
User nhấn "Cập nhật" → window.location.reload()
(hoặc tự reload khi user navigate sang trang khác)
```

### Thay đổi

#### 1. Tạo file `src/hooks/useVersionCheck.ts`
- Mỗi 5 phút, fetch `/index.html?t=timestamp` (bypass cache)
- Trích xuất `src` của thẻ `<script type="module">` từ HTML
- So sánh với giá trị lần đầu (lưu trong ref)
- Nếu khác → set state `updateAvailable = true`
- Expose hàm `applyUpdate()` = `window.location.reload()`

#### 2. Tạo file `src/components/UpdateNotification.tsx`
- Hiển thị toast/banner cố định ở dưới màn hình khi có bản cập nhật
- Nút "Cập nhật ngay" gọi `reload()`
- Thiết kế nhẹ nhàng, không che nội dung

#### 3. Sửa `src/App.tsx`
- Import và render `<UpdateNotification />` trong App
- Tự động reload khi user navigate (route change) nếu có update pending

### Chi tiết kỹ thuật
- Fetch `/index.html` dùng `fetch(url, { cache: 'no-store' })` để luôn lấy bản mới nhất
- Regex lấy hash từ script src: `/src="(\/assets\/index-[^"]+\.js)"/`
- Không dùng service worker (đã bị unregister trong index.html)
- Interval chỉ chạy khi tab active (`document.visibilityState === 'visible'`)

