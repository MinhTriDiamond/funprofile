

# Sửa logic cleanup Facebook link preview

## Phân tích gốc rễ

Từ test API trực tiếp, response trả về:
- `title: null`
- `author: "26 reactions · 11 comments | Cha bắn pháo hoa... Lê Minh Trí | Fath Uni"` ← toàn bộ junk
- `description: "Cha bắn pháo hoa..."` ← đúng

**Nguyên nhân chính**: Logic title↔author swap (dòng 338-351) đang gây lỗi:

1. Facebook trả `og:title` = toàn bộ chuỗi rác (engagement + nội dung + tagged names + author)
2. `author` = "Fath Uni" (từ meta tag)
3. Regex xóa engagement prefix (dòng 328) **có thể không match** vì HTML entities chưa được decode (ví dụ `&#xB7;` thay vì `·`)
4. Dòng 342: `t.includes(a)` → TRUE vì title chứa "Fath Uni" ở cuối
5. Dòng 343: `result.author = result.title` (vì title dài hơn) → **author bị ghi đè bằng chuỗi rác**
6. Dòng 346: `result.title = firstLine(description)` → trùng description → bị dedup → `null`

Kết quả: author = junk, title = null.

## Giải pháp — 3 sửa trong 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

**1. Decode HTML entities NGAY SAU khi extract** (trước cleanup):
```typescript
result.title = decodeHtmlEntities(extract('og:title') || ...);
result.description = decodeHtmlEntities(extract('og:description') || ...);
result.author = decodeHtmlEntities(extract('article:author') || ...);
```
Đảm bảo `&#xB7;` → `·` trước khi regex engagement chạy.

**2. Sửa title↔author swap** — không ghi đè author bằng title nếu title dài hơn nhiều (là junk):
```typescript
if (isFacebook && result.title && result.author) {
  const t = result.title.toLowerCase();
  const a = result.author.toLowerCase();
  if (t === a || a === t) {
    // Title = author name → dùng description làm title
    ...
  } else if (t.includes(a)) {
    // Title chứa author → KHÔNG swap, chỉ xóa author khỏi title
    result.title = result.title.replace(new RegExp(`\\s*\\|?\\s*${escapedAuthor}`, 'gi'), '').trim();
  }
}
```

**3. Thêm regex xóa tagged names** từ title:
```typescript
// Xóa danh sách tên người được tag (dãy 2+ tên viết hoa liên tiếp)
result.title = result.title.replace(/\s+(?:[A-ZÀ-Ỹ][a-zà-ỹ]+\s*){3,}$/u, '').trim();
```

### Kết quả mong đợi
- `author`: **Fath Uni**
- `title`: null (vì trùng description sau cleanup)
- `description`: Cha bắn pháo hoa ăn mừng Quốc Gia 5D hạnh phúc...

Sửa ~20 dòng trong `supabase/functions/fetch-link-preview/index.ts`, deploy lại.

