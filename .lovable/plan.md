

# Plan: 3 nhiệm vụ — Test E2E + Giphy API + Lazy Loading

## 1. Test End-to-End (thủ công)

Code hiện tại đã hoạt động đúng logic. Tôi sẽ dùng browser automation để kiểm tra luồng GIF/Sticker trong reply sau khi triển khai các thay đổi bên dưới.

## 2. Tích hợp Giphy API qua Edge Function

Hiện tại GifPicker chỉ tìm trong ~50 GIF curated. Cần thêm khả năng tìm kiếm từ Giphy API.

**Cần thêm secret:** `GIPHY_API_KEY` — user cần đăng ký tại [developers.giphy.com](https://developers.giphy.com) để lấy API key.

### Edge Function: `supabase/functions/giphy-search/index.ts`
- Nhận query param `q` (search term) và `offset` (pagination)
- Gọi Giphy Search API: `api.giphy.com/v1/gifs/search`
- Trả về danh sách GIF URLs đã format (dùng `images.fixed_width.url`)
- Nếu `q` rỗng, gọi Trending API thay thế

### Cập nhật `GifPicker.tsx`
- Thêm state cho API results, loading, hasMore, offset
- Khi user gõ search → debounce 400ms → gọi edge function
- Khi search rỗng → hiển thị curated GIFs (fallback offline)
- Merge kết quả API với curated khi cần

## 3. Lazy Loading + Infinite Scroll cho GIF Grid

### Cập nhật `GifPicker.tsx`
- Hiển thị ban đầu 20 GIF (từ API hoặc curated)
- Thêm IntersectionObserver ở cuối grid → khi user cuộn đến → load thêm 20 GIF tiếp
- Hiển thị skeleton loading khi đang fetch thêm
- Dừng load khi hết kết quả (`hasMore = false`)

## Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/giphy-search/index.ts` | **Tạo mới** — proxy Giphy API |
| `src/components/feed/GifPicker.tsx` | Thêm API search + infinite scroll + debounce |
| Secret `GIPHY_API_KEY` | **Cần user cung cấp** |

## Điều kiện tiên quyết
User cần cung cấp Giphy API key trước khi triển khai. Key miễn phí tại https://developers.giphy.com.

