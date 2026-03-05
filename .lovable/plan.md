

# Chỉnh sửa giao diện Link Preview giống Facebook

## Phân tích

Edge function **đang hoạt động tốt** — YouTube, Telegram, TikTok đều trả về đầy đủ metadata (title, image, description). Tuy nhiên, Facebook share link bị block (trả về "Log in or sign up to view") — đây là hạn chế của Facebook, không thể vượt qua.

**Vấn đề giao diện**: Card preview hiện tại chưa giống Facebook. Cần chỉnh:

## Thay đổi

### File: `src/components/feed/LinkPreviewCard.tsx`

Chỉnh style cho giống Facebook reference (images 651, 652):
- Bỏ `mx-4` → card chiếm full width bài viết (không có margin 2 bên)
- Bỏ `rounded-lg` → không bo góc (Facebook style)
- Thêm nền xám nhạt `bg-muted/30` cho phần text
- Domain hiển thị UPPERCASE (đã có `uppercase` class)
- Title font lớn hơn, bỏ hover underline
- Ảnh preview không giới hạn `max-h-[300px]` quá thấp, tăng lên phù hợp hơn

### File: `src/components/feed/FacebookPostCard.tsx`

- Cho phép hiển thị link preview **ngay cả khi bài có media** (vì user có thể đăng ảnh kèm link YouTube) — nhưng ưu tiên: nếu bài đã có media thì vẫn hiển thị preview bên dưới media
- Sửa logic `firstUrl` để luôn extract URL từ content (không phụ thuộc `hasNativeMedia`)

### File: `supabase/functions/fetch-link-preview/index.ts`

- Thêm xử lý đặc biệt cho Facebook: nếu title = "Log in or sign up to view" → coi như không có data, fallback hiển thị domain + favicon đơn giản thay vì card sai nội dung
- Proxy ảnh qua edge function nếu ảnh bị CORS block (dùng endpoint `?proxy=` đã có sẵn)

Tổng: sửa **3 file**, không thay đổi database.

