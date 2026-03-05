

# Link Preview (Unfurling) cho URL trong bài viết

## Vấn đề hiện tại

Khi user dán link Facebook hoặc trang web khác vào nội dung bài viết, link chỉ hiển thị dạng text thuần. Không có hình ảnh, tiêu đề hay mô tả preview giống như Facebook/Telegram thường làm.

## Giải pháp

### 1. Mở rộng Edge Function `fetch-link-preview` (sửa file hiện có)

Hiện tại function này chỉ trả về `avatarUrl`. Cần thêm endpoint mới (hoặc mode mới) để scrape **full OG metadata**:

- `og:title` → tiêu đề
- `og:description` → mô tả
- `og:image` → hình ảnh preview
- `og:video` → video (nếu có)
- `og:site_name` → tên trang (Facebook, YouTube, TikTok...)
- Favicon của trang

Request: `POST { url, mode: 'preview' }` (mode mặc định vẫn là avatar để không ảnh hưởng code cũ)

Response:
```json
{
  "title": "Bài viết trên Facebook",
  "description": "Cha bắn pháo hoa ăn mừng...",
  "image": "https://...",
  "video": null,
  "siteName": "Facebook",
  "favicon": "https://facebook.com/favicon.ico",
  "url": "https://facebook.com/share/..."
}
```

### 2. Tạo component `LinkPreviewCard` (file mới)

**File: `src/components/feed/LinkPreviewCard.tsx`**

- Nhận prop `url: string`
- Gọi edge function với `mode: 'preview'` khi mount
- Cache kết quả trong `Map` (tránh fetch lại cùng URL)
- Hiển thị card preview giống Facebook:
  - Hình ảnh lớn phía trên (hoặc bên trái nếu không có ảnh lớn)
  - Tên trang (siteName) + favicon
  - Tiêu đề (bold)
  - Mô tả (1-2 dòng, cắt ngắn)
  - Click vào card → mở link trong tab mới
- Loading skeleton khi đang fetch
- Fallback: nếu không scrape được → hiển thị URL domain + favicon đơn giản

### 3. Tạo hook `useLinkPreview` (file mới)

**File: `src/hooks/useLinkPreview.ts`**

- Quản lý cache global (module-level `Map<string, PreviewData>`)
- Gọi edge function, xử lý loading/error state
- Trả về `{ data, isLoading, error }`

### 4. Tích hợp vào `ExpandableContent` hoặc `FacebookPostCard`

**File: `src/components/feed/FacebookPostCard.tsx`**

- Trích xuất URL đầu tiên từ `post.content` bằng regex
- Nếu post **không có** `image_url` và **không có** `video_url` (tức là bài chỉ có text + link) → render `<LinkPreviewCard url={firstUrl} />` ngay dưới content
- Nếu post đã có media riêng → không hiển thị preview (tránh thừa)

### 5. Giới hạn & Performance

- Chỉ preview URL **đầu tiên** trong bài (không preview tất cả URL)
- Cache ở client-side (memory) → cùng URL không fetch lại
- Không preview URL nội bộ (fun.rich)
- Edge function timeout 8 giây cho scraping

## Tóm tắt file thay đổi

| File | Hành động |
|------|-----------|
| `supabase/functions/fetch-link-preview/index.ts` | Thêm mode `preview` scrape full OG |
| `src/components/feed/LinkPreviewCard.tsx` | **Mới** — UI card preview |
| `src/hooks/useLinkPreview.ts` | **Mới** — hook fetch + cache |
| `src/components/feed/FacebookPostCard.tsx` | Tích hợp LinkPreviewCard |

Tổng: sửa **2 file**, tạo **2 file mới**. Không thay đổi database.

