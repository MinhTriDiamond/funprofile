

# Sửa lỗi hình ảnh Link Preview Facebook không hiển thị

## Nguyên nhân gốc

Khi test proxy endpoint, Facebook trả về **HTML redirect** thay vì ảnh thật:
```
lookaside.fbsbx.com → redirect → facebook.com/photo.php (login wall)
```

Proxy hiện dùng User-Agent `Mozilla/5.0 (compatible; FunProfile/1.0)` — Facebook không nhận diện đây là crawler hợp lệ nên redirect về trang login.

Trong khi edge function scrape metadata dùng User-Agent `facebookexternalhit/1.1` → Facebook trả đúng og:image URL. Nhưng khi proxy fetch ảnh, lại dùng UA khác → Facebook block.

## Giải pháp

### File: `supabase/functions/fetch-link-preview/index.ts`

Sửa proxy endpoint:
1. Dùng User-Agent `facebookexternalhit/1.1` cho các URL từ Facebook domains (fbsbx.com, fbcdn.net)
2. Kiểm tra response `content-type`: nếu trả về `text/html` thay vì `image/*` → nghĩa là bị redirect/block → trả 404 thay vì trả HTML
3. Thêm `redirect: 'manual'` cho Facebook URLs để phát hiện redirect sớm

### File: `src/components/feed/LinkPreviewCard.tsx`

Cải thiện xử lý khi ảnh bị lỗi:
- Khi `onError` xảy ra, thay vì ẩn ảnh (`display: none`), dùng state để chuyển sang hiển thị không có ảnh — giữ phần metadata (title, description, domain) vẫn hiển thị đầy đủ

Tổng: sửa **2 file**, deploy lại edge function.

