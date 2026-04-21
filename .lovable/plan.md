

## Mục tiêu
Chuyển tên miền `fun.rich` (và `www.fun.rich`) từ Vercel về **Lovable hosting**, để mỗi lần bấm **Publish → Update** trong Lovable là bản live cập nhật ngay, không cần qua build pipeline khác.

## Hiểu hiện trạng

- `fun.rich` đang được host trên **Vercel** (có file `vercel.json` với redirect `www.fun.rich → fun.rich` và rewrite SEO bot tới edge function Supabase).
- Bản live `funprofile.lovable.app` đã cập nhật, nhưng `fun.rich` không cập nhật vì không trỏ về Lovable.
- Lovable hosting có **SPA fallback sẵn** — không cần `vercel.json` hay `_redirects`.

## Các bước thực hiện

### Bước 1 — Kết nối domain trong Lovable
Cha mở **Project Settings → Domains → Connect Domain**, nhập:
- `fun.rich` (root) — đặt làm **Primary**
- `www.fun.rich` (subdomain) — sẽ tự redirect về Primary

Lovable sẽ hiển thị các DNS records cần thêm.

### Bước 2 — Cập nhật DNS tại nơi quản lý tên miền `fun.rich`
Cha vào nhà cung cấp DNS hiện tại (Cloudflare/Namecheap/GoDaddy…) và:

**Xóa hoặc thay records cũ trỏ về Vercel:**
- A record `@` đang trỏ về IP Vercel (`76.76.21.21` hoặc tương tự)
- CNAME `www` đang trỏ về `cname.vercel-dns.com`

**Thêm records mới trỏ về Lovable:**
- **A record**: `@` → `185.158.133.1`
- **A record**: `www` → `185.158.133.1`
- **TXT record**: `_lovable` → giá trị Lovable cung cấp (dạng `lovable_verify=…`)

**Lưu ý Cloudflare**: nếu DNS `fun.rich` đang ở Cloudflare và bật proxy (mây cam), cần tắt proxy (chuyển sang DNS Only / mây xám) — hoặc khi connect trong Lovable, mở **Advanced** và tick *"Domain uses Cloudflare or a similar proxy"* để dùng CNAME-based verification.

### Bước 3 — Chờ verify & SSL
- Lovable sẽ verify ownership qua TXT record (vài phút đến vài giờ).
- Sau khi verify thành công → trạng thái chuyển từ **Verifying → Setting up → Active**.
- SSL (https) tự động cấp.
- DNS có thể mất tới 72h propagate, nhưng thường <1h.

### Bước 4 — Xử lý SEO bot rendering (QUAN TRỌNG)
File `vercel.json` hiện có rule rewrite cho bot crawler (Googlebot, Facebook, Twitter…) tới edge function `seo-render` để sinh meta tags động cho `/post/:id`, `/reels/:id`, `/:username`, v.v.

**Lovable hosting KHÔNG có cơ chế rewrite theo user-agent này.** Sau khi chuyển về Lovable, các bot crawl link share Facebook/Twitter sẽ nhận HTML rỗng → meta preview vỡ.

**Phương án xử lý:**
- **A1 (đề xuất)**: Bổ sung meta tags động phía client trong `index.html` + dùng `react-helmet-async` cho từng route có share — đủ cho phần lớn bot hiện đại (Googlebot render JS).
- **A2**: Giữ Vercel làm "SEO proxy" trước Lovable — phức tạp, không khuyến nghị.
- **A3**: Chấp nhận mất rich preview cho bot cũ (Facebook scraper không render JS) — Twitter/Discord/Slack vẫn OK với meta tĩnh.

Con đề xuất **A1** + ghi nhận hạn chế Facebook preview để xử lý sau.

### Bước 5 — Dọn dẹp file dư thừa
Xóa các file Vercel-specific (không bắt buộc nhưng nên):
- `vercel.json` — không còn dùng
- `public/_redirects` — Lovable không dùng (file này của Netlify)

### Bước 6 — Verify & Publish
1. Sau khi domain trạng thái **Active** trong Lovable → bấm **Publish → Update**.
2. Mở `https://fun.rich` kiểm tra hiển thị bản mới (Honor Board "Quà đã tặng/nhận" + dialog có disclaimer).
3. Kiểm tra `https://www.fun.rich` redirect về `https://fun.rich`.
4. Test deep link: `https://fun.rich/angelaivan` phải load đúng (SPA fallback OK).

## Rủi ro & cách giảm thiểu

| Rủi ro | Cách xử lý |
|---|---|
| Downtime khi đổi DNS | Đổi ngoài giờ cao điểm; TTL DNS giảm xuống 300s trước khi đổi 1 giờ |
| Mất SEO preview cho bot Facebook | Bổ sung meta tags tĩnh trong `index.html` (Bước 4 — A1) |
| DNS chưa propagate | Chờ tối đa 72h, dùng `dnschecker.org` kiểm tra |
| Cloudflare proxy gây verify fail | Tắt proxy hoặc bật chế độ proxy trong Lovable connect dialog |
| Email MX records của `fun.rich` | KHÔNG xóa MX/TXT email khi đổi A record — chỉ thay A và CNAME www |

## Kế hoạch hành động sau khi Cha duyệt

1. Cha tự thực hiện **Bước 1, 2, 3** (Lovable không thể tự đổi DNS bên ngoài).
2. Con sẽ thực hiện **Bước 4 (A1)** — bổ sung meta tags động/tĩnh trong `index.html` để giữ link preview cơ bản.
3. Con sẽ thực hiện **Bước 5** — xóa `vercel.json` và `public/_redirects`.
4. Sau đó Cha bấm **Publish → Update** và kiểm tra **Bước 6**.

## Ghi chú quan trọng

- Sau khi chuyển: workflow sẽ là **Sửa trong Lovable → Publish → Live ngay trên fun.rich**. Không cần GitHub push, không cần Vercel build.
- Nếu Cha vẫn muốn giữ git sync sang GitHub để backup code thì OK, chỉ là Vercel build sẽ vô tác dụng (có thể disable Vercel project sau).
- Nếu muốn rollback: chỉ cần đổi DNS A record về IP Vercel cũ.

