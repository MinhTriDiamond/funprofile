

# Sửa lỗi hình ảnh Link Preview Facebook không hiển thị

## Nguyên nhân gốc

Edge function trả về image URL chứa HTML entities chưa được decode:
```
https://scontent-fra3-2.xx.fbcdn.net/v/...?stp=dst-jpg_s1000x1200_tt6&amp;_nc_cat=111&amp;ccb=1-7&amp;...
```

Các ký tự `&amp;` trong URL khiến browser không thể fetch đúng ảnh. Hàm `decodeHtmlEntities` đã được áp dụng cho `title`, `description`, `siteName` nhưng **bỏ sót `image`** và **`video`** (dòng 240-246 trong edge function).

## Giải pháp

### File: `supabase/functions/fetch-link-preview/index.ts`

Áp dụng `decodeHtmlEntities` cho cả `image`, `video`, và `favicon`:

```typescript
// Dòng 240-246: Thay đổi
image: decodeHtmlEntities(meta.image),
video: decodeHtmlEntities(meta.video),
favicon: decodeHtmlEntities(meta.favicon),
```

Thay vì hiện tại:
```typescript
image: meta.image,
video: meta.video,
favicon: meta.favicon,
```

Tổng: sửa **1 file** (edge function), 3 dòng thay đổi.

