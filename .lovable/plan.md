

# Sửa lỗi Facebook video share link không trả về metadata

## Vấn đề

Test API trực tiếp cho thấy Facebook **hoàn toàn chặn** UA `facebookexternalhit` với các link dạng `facebook.com/share/v/...` — trả về tất cả `null` (title, image, video, description, author đều rỗng).

Screenshot của con hiển thị dữ liệu cũ đã cache — thực tế API hiện tại không lấy được gì.

## Giải pháp — Multi-UA Fallback

### File: `supabase/functions/fetch-link-preview/index.ts`

Sửa hàm `scrapePageMeta` để thử nhiều User-Agent nếu UA đầu tiên thất bại:

1. **UA 1** (mặc định): `facebookexternalhit/1.1` — hoạt động tốt cho hầu hết link
2. **UA 2** (fallback): `Googlebot/2.1` — Google crawler thường được Facebook tin tưởng hơn
3. **UA 3** (fallback cuối): `Twitterbot/1.0` — Twitter crawler

Logic:
```text
scrapePageMeta(url):
  for each UA in [facebookexternalhit, Googlebot, Twitterbot]:
    fetch with UA
    extract OG tags
    if (title || image) → return result  // có data → dừng
  return empty result  // tất cả UA đều thất bại
```

**Chỉ áp dụng retry cho Facebook URLs** (isFacebook = true). Các URL khác vẫn dùng 1 UA duy nhất.

### Xử lý thêm cho Facebook share/v/ links

Facebook `share/v/` thường redirect đến URL video thật. Thêm logic:
- Nếu URL chứa `/share/v/` hoặc `/share/p/`, thử `fetch` với `redirect: 'manual'` trước để lấy URL đích thật, rồi scrape URL đích đó.

### Tổng sửa

- 1 file: `supabase/functions/fetch-link-preview/index.ts`
- Thêm ~30 dòng logic retry UA + redirect resolution
- Deploy lại edge function

