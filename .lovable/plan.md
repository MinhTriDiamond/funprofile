

# Sửa lỗi Facebook link preview không hiển thị hình ảnh/video

## Nguyên nhân gốc

Ở lần sửa trước, UA cho Facebook đã bị đổi từ `facebookexternalhit` sang mobile UA. Kết quả test thực tế cho thấy mobile UA trả về **hoàn toàn rỗng** (login wall) — mất toàn bộ image, title, video, description.

## Giải pháp — sửa 1 file

### File: `supabase/functions/fetch-link-preview/index.ts`

**Dòng 93-94**: Đổi lại UA cho Facebook về `facebookexternalhit` (UA cũ hoạt động tốt):

```typescript
const ua = isFacebook
  ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  : 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
```

Thực tế cả hai nhánh đều dùng cùng UA, nên đơn giản hóa thành một dòng duy nhất.

Giữ nguyên toàn bộ logic fallback author (JSON-LD, ownerName, actorName, fbPatterns) — chúng vẫn hoạt động nếu HTML có chứa data. Chỉ cần quay lại UA cũ để Facebook trả về OG metadata đầy đủ.

Tổng: sửa **2 dòng** trong 1 file, deploy lại edge function.

