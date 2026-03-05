

# Sửa hiển thị trùng lặp "Fath" và "Fath Uni"

## Vấn đề
Facebook trả về `og:site_name` = "Fath" (tên trang) và author = "Fath Uni" (tên đầy đủ). Component hiện tại hiển thị cả hai dòng riêng biệt, gây trùng lặp.

## Giải pháp — sửa 1 file

### File: `src/components/feed/LinkPreviewCard.tsx`

Trong `metadataBlock`, thêm logic: nếu `author` tồn tại và `siteName` là substring của `author` (hoặc ngược lại), ẩn dòng `siteName`, chỉ hiển thị `author`. Cụ thể:

- Dòng 122: thay `{data.siteName || domain}` bằng logic kiểm tra trùng lặp
- Nếu `author` chứa `siteName` → chỉ hiển thị domain ở dòng site, rồi hiển thị `author` bên dưới
- Hoặc đơn giản hơn: khi `author` tồn tại, dòng site name luôn hiển thị domain thay vì `siteName` (tránh trùng)

```typescript
// Thay dòng 122:
<span>{(data.author && data.siteName && 
  data.author.toLowerCase().includes(data.siteName.toLowerCase())) 
  ? domain : (data.siteName || domain)}</span>
```

Sửa ~1 dòng, không thay đổi edge function.

