

# Hiển thị tên người đăng bài trong Link Preview (đặc biệt Facebook)

## Vấn đề
Hiện tại edge function dùng `article:author` và `name="author"` để lấy tên tác giả. Tuy nhiên **Facebook không dùng các thẻ này** — kết quả test thực tế cho thấy `author: null` cho mọi link Facebook. Tên người đăng (như "Fath Uni") nằm trong các vị trí khác trong HTML.

## Giải pháp — sửa 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

Mở rộng logic trích xuất `author` bằng cách thêm nhiều phương pháp fallback:

1. **Giữ nguyên** `article:author` / `name="author"` cho các trang tin tức thông thường

2. **Thêm fallback: JSON-LD structured data** — Facebook và nhiều trang khác nhúng thông tin tác giả trong `<script type="application/ld+json">`:
   ```json
   {"@type":"VideoObject","author":{"name":"Fath Uni"}}
   ```
   Regex trích xuất: tìm `"author"` → `"name":"..."` trong JSON-LD blocks

3. **Thêm fallback: Facebook inline JSON** — Facebook nhúng data trong các `<script>` tags với patterns:
   - `"ownerName":"Fath Uni"` 
   - `"name":"Fath Uni"` trong actor/owner objects
   - `"pageTitle":"Fath Uni"` cho profile pages

4. **Thêm fallback: `og:title` heuristic cho Facebook** — Khi domain là facebook.com và `og:title` tồn tại nhưng `author` vẫn null, kiểm tra xem `og:title` có phải là tên người (ngắn, không chứa từ khóa bài viết) → dùng làm author

5. **Thêm fallback: `profile:first_name` + `profile:last_name`** meta tags (chuẩn Open Graph cho profile pages)

Thứ tự ưu tiên:
```text
article:author → name="author" → JSON-LD author.name → FB ownerName → og:title (FB heuristic) → profile:first_name + last_name
```

### Chi tiết code thay đổi

Sau dòng `result.author = extract('article:author') || extractName('author');` (dòng 130), thêm block fallback:

```typescript
// Fallback 1: JSON-LD author
if (!result.author) {
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ldMatch) {
    for (const block of ldMatch) {
      const jsonStr = block.replace(/<\/?script[^>]*>/gi, '');
      try {
        const ld = JSON.parse(jsonStr);
        const authorObj = ld.author || ld.creator;
        if (authorObj) {
          result.author = typeof authorObj === 'string' ? authorObj : authorObj.name || null;
          if (result.author) break;
        }
      } catch { /* ignore */ }
    }
  }
}

// Fallback 2: Facebook inline ownerName / actorName
if (!result.author) {
  const ownerMatch = html.match(/"ownerName"\s*:\s*"([^"]+)"/);
  if (ownerMatch?.[1]) result.author = ownerMatch[1];
}
if (!result.author) {
  const actorMatch = html.match(/"actorName"\s*:\s*"([^"]+)"/);
  if (actorMatch?.[1]) result.author = actorMatch[1];
}

// Fallback 3: profile:first_name + profile:last_name
if (!result.author) {
  const firstName = extract('profile:first_name');
  const lastName = extract('profile:last_name');
  if (firstName) result.author = [firstName, lastName].filter(Boolean).join(' ');
}
```

Tổng: sửa **1 file** (edge function), thêm ~25 dòng logic fallback. Không thay đổi gì ở frontend (đã hiển thị `data.author` sẵn rồi).

