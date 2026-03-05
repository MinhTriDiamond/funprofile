

# Sửa Link Preview hiển thị fallback cho Facebook links

## Vấn đề

Kết quả test edge function xác nhận: Facebook block hoàn toàn scraping, trả về tất cả metadata = `null`.

Trong `useLinkPreview.ts` dòng 63:
```typescript
return result.title || result.image ? result : null;
```
→ Khi cả `title` và `image` đều null → trả về `null` → `LinkPreviewCard` nhận `null` → không render gì.

Nhưng `LinkPreviewCard` **đã có sẵn** UI fallback (hiển thị domain + icon) cho trường hợp không có title/image — chỉ là nó không bao giờ được kích hoạt vì data bị filter thành `null` trước đó.

## Giải pháp

### File: `src/hooks/useLinkPreview.ts`
- Sửa logic `fetchPreview`: luôn trả về `result` (không trả `null`) khi có ít nhất URL hợp lệ, để fallback UI trong `LinkPreviewCard` có thể render
- Vẫn cache chỉ khi có title/image (để không cache kết quả rỗng vĩnh viễn)

### File: `src/components/feed/LinkPreviewCard.tsx`  
- Cập nhật fallback UI: hiển thị favicon + domain cho mọi link không có title/image (bao gồm Facebook)
- Đảm bảo fallback card vẫn có style nhất quán (nền xám, border)

Tổng: sửa **2 file frontend**, không thay đổi edge function.

