

# Sửa hiển thị trùng lặp author/title trên Facebook link preview

## Vấn đề thực tế (từ test API)

Facebook trả về cho các bài viết của "Fath Uni":
```json
{
  "title": "Fath Uni",      // ← og:title = tên tác giả, KHÔNG PHẢI tiêu đề bài
  "author": "Fath",          // ← trích xuất một phần từ article:author
  "description": "Bài 6: NETWORK CIVILIZATION..."  // ← nội dung thật
}
```

Component hiển thị cả 3 dòng: "Fath" (author) + "Fath Uni" (title) + description → trùng lặp.

## Giải pháp — sửa 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

Thêm logic sau phần clean up engagement prefix (sau dòng 192), dành riêng cho Facebook:

**Khi `author` là substring của `title` (hoặc ngược lại)** → hợp nhất:
- `author` = giá trị dài hơn (ví dụ "Fath Uni")
- `title` = dòng đầu tiên của `description` (nội dung bài thật)

```typescript
// Facebook: og:title thường là tên tác giả, không phải tiêu đề bài
if (isFacebook && result.title && result.author) {
  const t = result.title.toLowerCase();
  const a = result.author.toLowerCase();
  if (t.includes(a) || a.includes(t)) {
    // Giữ tên đầy đủ hơn làm author
    result.author = result.title.length >= result.author.length ? result.title : result.author;
    // Lấy dòng đầu description làm title thật
    if (result.description) {
      const firstLine = result.description.split('\n')[0].trim();
      result.title = firstLine.length > 10 ? firstLine : null;
    } else {
      result.title = null;
    }
  }
}
```

**Kết quả sau sửa:**
```json
{
  "author": "Fath Uni",
  "title": "Bài 6: NETWORK CIVILIZATION - HÌNH THÀNH NỀN VĂN MINH TỪ INTERNET",
  "description": "Bài 6: NETWORK CIVILIZATION..."
}
```

→ Hiển thị: **facebook.com** → **Fath Uni** → **Bài 6: NETWORK CIVILIZATION...**

Sửa ~12 dòng trong 1 file, deploy lại edge function.

