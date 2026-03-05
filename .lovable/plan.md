

# Sửa lỗi hình ảnh Link Preview không hiển thị

## Nguyên nhân

Edge function trả về đúng URL ảnh từ Facebook (`https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=...`), nhưng **trình duyệt không tải được ảnh** vì Facebook CDN chặn request từ domain khác (CORS/referrer policy). Kết quả: `onError` handler ẩn thẻ `<img>` → không thấy ảnh.

## Giải pháp

Proxy ảnh qua edge function (endpoint `?proxy=` đã có sẵn) cho các URL từ Facebook CDN.

### File: `src/components/feed/LinkPreviewCard.tsx`

- Thêm hàm `getProxiedImageUrl()`: kiểm tra nếu URL ảnh chứa `fbcdn.net` hoặc `fbsbx.com` → chuyển qua proxy endpoint `fetch-link-preview?proxy=<encoded_url>`
- Áp dụng cho thẻ `<img>` preview

### File: `src/hooks/useLinkPreview.ts`

- Thêm logic proxy URL ảnh ngay khi nhận response từ edge function, để cache luôn URL đã proxy

Tổng: sửa **1-2 file frontend**, không cần thay đổi edge function.

