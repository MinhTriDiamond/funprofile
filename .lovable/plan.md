

# Hiển thị tên tác giả trong Link Preview Card

## Vấn đề
Hiện tại card chỉ hiển thị domain (FACEBOOK.COM) và tiêu đề bài viết, nhưng không hiển thị tên người đăng bài gốc (ví dụ "Fath Uni" như trong ảnh tham khảo).

## Giải pháp — sửa 3 file

### 1. Edge Function (`supabase/functions/fetch-link-preview/index.ts`)
Thêm scrape trường `article:author` và `og:article:author` từ HTML:
```typescript
result.author = extract('article:author') || extractName('author');
```
Trả về thêm trường `author` trong response JSON.

### 2. Hook (`src/hooks/useLinkPreview.ts`)
Thêm trường `author: string | null` vào interface `LinkPreviewData` và mapping trong `fetchPreview`.

### 3. Component (`src/components/feed/LinkPreviewCard.tsx`)
Hiển thị `data.author` (nếu có) ngay dưới dòng domain/siteName, trước title — font đậm, kích thước nhỏ, tương tự style Facebook:

```text
┌─────────────────────────────┐
│  [Video / Image]            │
├─────────────────────────────┤
│  🌐 FACEBOOK.COM            │  ← siteName/domain
│  Fath Uni                   │  ← author (mới)
│  Tiêu đề bài viết...       │  ← title
│  Mô tả ngắn...             │  ← description
└─────────────────────────────┘
```

