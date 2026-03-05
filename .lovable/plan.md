

# Sửa 2 lỗi hiển thị tên trong Facebook link preview

## Phân tích gốc rễ

### Lỗi 1: Hiển thị "Camly" sai (screenshot 670)
URL `/share/v/15XW1dHNKv/` không redirect được → tất cả UA đều thất bại → vào nhánh inline JSON extraction. Pattern cuối cùng trong `authorPatterns` là:
```javascript
/"name"\s*:\s*"([^"]{2,50})"/
```
Pattern này **quá generic** — match bất kỳ `"name": "..."` nào trong JavaScript của Facebook login wall, kể cả tên ngẫu nhiên như "Camly" từ suggested posts. Kết quả: `author = "Camly"` (sai hoàn toàn).

### Lỗi 2: Hiển thị 2 tên "Fath" + "Fath Uni" (screenshot 671)
URL `/share/p/1DV77HExB5/` redirect thành công, API trả về:
- `author: "Fath"` (từ `article:author` hoặc inline)
- `title: "Fath Uni"` (từ `og:title` — Facebook đặt og:title = tên page)

Logic swap (dòng 350): `"fath uni".includes("fath")` → TRUE → cố strip "Fath" khỏi title bằng regex `\s*\|?\s*Fath\s*$`. Nhưng "Fath" nằm ở ĐẦU title, không phải cuối → regex không match → title vẫn là "Fath Uni" → UI hiện cả hai.

## Giải pháp — sửa 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

**1. Xóa pattern `"name"` quá generic** khỏi `authorPatterns` trong inline extraction (dòng 203):
```typescript
const authorPatterns = [
  /"ownerName"\s*:\s*"([^"]+)"/,
  /"actorName"\s*:\s*"([^"]+)"/,
  // BỎ: /"name"\s*:\s*"([^"]{2,50})"/ — quá generic, match tên ngẫu nhiên
];
```

**2. Sửa logic title↔author swap** (dòng 350-356): Khi title ngắn (< 60 ký tự) và chứa author → title là tên page đầy đủ hơn → dùng title làm author, clear title:
```typescript
} else if (t.includes(a)) {
  // Title chứa author & ngắn → title là tên page đầy đủ hơn
  if (result.title!.length < 60) {
    result.author = result.title; // "Fath Uni" (đầy đủ hơn "Fath")
    // Dùng description làm title
    if (result.description) {
      const firstLine = result.description.split('\n')[0].trim();
      result.title = firstLine.length > 10 ? firstLine : null;
    } else {
      result.title = null;
    }
  } else {
    // Title dài → là nội dung thực, chỉ strip author
    const escapedA = result.author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result.title = result.title.replace(new RegExp(`\\s*\\|?\\s*${escapedA}\\s*$`, 'gi'), '').trim();
    result.title = result.title.replace(/\s+(?:[A-ZÀ-Ỹa-zà-ỹ]+\s+){2,}[A-ZÀ-Ỹa-zà-ỹ]+\s*$/u, '').trim();
    if (!result.title) result.title = null;
  }
```

### Kết quả mong đợi
- Bài có hình (1DV77HExB5): author = **Fath Uni**, title = null (trùng description), description hiển thị bình thường
- Bài video không resolve (15XW1dHNKv): author = null (không còn "Camly" sai), chỉ hiện fallback card

Sửa ~15 dòng, deploy lại edge function.

