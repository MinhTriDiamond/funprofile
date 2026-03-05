

# Sửa lỗi không hiển thị tên tác giả Facebook trong Link Preview

## Phân tích vấn đề

Từ ảnh chụp, `og:title` Facebook trả về có dạng:
```
24 reactions · 11 comments | Cha bắn pháo hoa ăn mừng...
```

Tên "Fath Uni" **không nằm trong og:title** mà nằm ẩn trong HTML nội bộ của Facebook. Các fallback hiện tại (JSON-LD, `ownerName`, `actorName`) có thể không hoạt động vì Facebook obfuscate HTML khi trả về cho bot.

## Giải pháp — sửa 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

**1. Thêm nhiều pattern regex Facebook-specific hơn để trích xuất author:**

```typescript
// Pattern bổ sung cho Facebook
/"user_name"\s*:\s*"([^"]+)"/
/"profileName"\s*:\s*"([^"]+)"/  
/"short_name"\s*:\s*"([^"]+)"/
/"name"\s*:\s*"([^"]+)"[^}]*"__typename"\s*:\s*"User"/
```

**2. Dọn dẹp og:title — loại bỏ prefix "X reactions · Y comments |":**

Facebook thường thêm prefix engagement metrics vào og:title. Cần strip pattern này:
```typescript
// "24 reactions · 11 comments | Tiêu đề thật" → "Tiêu đề thật"
if (result.title) {
  result.title = result.title.replace(/^\d+\s+reactions?\s*·\s*\d+\s+comments?\s*\|\s*/i, '');
}
```

**3. Thử User-Agent mobile cho Facebook** (Facebook trả về HTML đầy đủ hơn cho mobile bot):

Thay vì chỉ dùng `facebookexternalhit`, thử thêm UA mobile nếu lần đầu không lấy được author:
```
Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 ... Mobile Safari/537.36
```

**4. Fallback cuối: dùng `content_owner_id_new` hoặc tương tự** trong HTML Facebook để ít nhất xác định có owner.

### Tổng kết thay đổi
- Sửa **1 file** (edge function)
- Thêm ~15 dòng regex patterns mới cho Facebook
- Thêm logic strip engagement prefix từ og:title
- Deploy lại edge function

