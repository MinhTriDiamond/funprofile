

# Sửa lỗi Link Preview không hiển thị

## Nguyên nhân

Edge Function `fetch-link-preview` trong repo đã có code xử lý `mode: 'preview'`, nhưng **phiên bản đang chạy trên server là phiên bản cũ** — không có branch `if (mode === 'preview')`.

Bằng chứng từ logs:
- Không có dòng `"Preview mode for:"` nào trong logs
- Request `{"url":"...","mode":"preview"}` trả về `{"avatarUrl":null}` — đây là response của nhánh avatar (cũ)

## Giải pháp

### Bước 1: Deploy lại Edge Function

Chỉ cần deploy lại `fetch-link-preview` để phiên bản mới (đã có code preview mode) được cập nhật lên server.

### Bước 2: Xử lý Facebook block scraping (vấn đề phụ)

Ngay cả sau khi deploy, Facebook **rất có thể block scraping** từ server (trả về trang login thay vì OG tags). Đây là hạn chế chung, không chỉ riêng app này.

Để xử lý, cần cập nhật `scrapePageMeta` trong edge function:
- Thêm `User-Agent` giả lập Facebook bot: `facebookexternalhit/1.1`
- Thêm fallback: nếu không scrape được OG data từ Facebook share link → hiển thị card đơn giản với domain + favicon

Tổng: deploy lại **1 edge function**, có thể sửa nhẹ user-agent trong function.

