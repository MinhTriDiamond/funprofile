

# Sửa lỗi dữ liệu thừa trong Facebook link preview

## Vấn đề

Facebook trả về `og:title` chứa rất nhiều rác:
```
26 reactions · 11 comments | Cha bắn pháo hoa ăn mừng... ĐÃ HÌNH THÀNH!!! Camly Duong Diệu Ngọc Nguyen Ai Van Trang Nguyễn... Lê Minh Trí | Fath Uni
```

Có 3 vấn đề cụ thể:

1. **Regex xóa engagement prefix không hoạt động** — ký tự `·` (middle dot) trong HTML thực tế có thể khác với ký tự trong regex (Unicode variants: `·` U+00B7, `·` U+2027, `•` U+2022, `⋅` U+22C5)
2. **Tên những người được tag** vẫn nằm trong title: "Camly Duong Diệu Ngọc Nguyen Ai Van Trang..."
3. **Suffix `| Fath Uni`** (tên page) vẫn dính vào cuối title, trùng với `author`

## Giải pháp — sửa 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

**1. Mở rộng regex engagement prefix** (dòng 326-328) để match nhiều dạng middle dot:
```typescript
// Match nhiều dạng ký tự dot/bullet Unicode
result.title = result.title.replace(
  /^\d+\s+(?:reactions?|cảm xúc)\s*[·•⋅]\s*\d+\s+(?:comments?|bình luận)\s*\|\s*/i, ''
);
```

**2. Xóa suffix `| PageName`** ở cuối title (nếu trùng author):
```typescript
if (result.author && result.title) {
  // Xóa "| Fath Uni" ở cuối
  const suffixPattern = new RegExp(`\\s*\\|\\s*${result.author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  result.title = result.title.replace(suffixPattern, '');
}
```

**3. Nếu title ≈ description** (chứa cùng nội dung), set `title = null` để tránh hiển thị trùng:
```typescript
if (result.title && result.description) {
  const normT = result.title.substring(0, 80).toLowerCase().trim();
  const normD = result.description.substring(0, 80).toLowerCase().trim();
  if (normT === normD || normD.startsWith(normT) || normT.startsWith(normD)) {
    result.title = null; // Tránh hiển thị trùng
  }
}
```

**Kết quả mong đợi:**
- Dòng site: `facebook.com`
- Dòng author: **Fath Uni**
- Dòng description: Cha bắn pháo hoa ăn mừng Quốc Gia 5D hạnh phúc...

Sửa ~15 dòng, deploy lại edge function.

