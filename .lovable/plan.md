

# Sửa lỗi deploy Cloudflare Pages — File `_redirects`

## Nguyên nhân

File `public/_redirects` hiện tại chứa:

```
/* /index.html 200!
```

Dấu `!` là cú pháp "force" của **Netlify**, không được Cloudflare Pages hỗ trợ. CF Pages chỉ chấp nhận status code thuần: `200`, `301`, `302`, `303`, `307`, `308`.

Log lỗi xác nhận:
- `Found invalid redirect lines: /* /index.html 200! — Valid status codes are 200, 301, 302 (default), 303, 307, or 308. Got 200!.`
- `Parsed 0 valid redirect rules.` — nghĩa là **không có redirect rule nào hoạt động**
- `Failed to publish your Function` — lỗi nội bộ có thể do redirect rule không hợp lệ

## Thay đổi

### File: `public/_redirects`

```
/* /index.html 200
```

Bỏ dấu `!` — chỉ thay đổi 1 ký tự duy nhất. Rule `/* /index.html 200` vẫn đảm bảo SPA routing hoạt động đúng trên CF Pages (mọi route trả về `index.html` với status 200).

## Ghi chú

- CF Pages có hỗ trợ SPA routing sẵn qua `_redirects` với status `200` — không cần dấu `!`
- Nếu dự án cũng deploy trên Netlify, có thể tạo thêm file `public/_redirects` riêng cho Netlify hoặc dùng `vercel.json` / `netlify.toml` tùy nền tảng

