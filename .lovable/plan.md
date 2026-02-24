
# Fix Facebook khong hien hinh anh khi chia se link bai viet

## Nguyen nhan da tim thay

Sau khi test truc tiep edge function `seo-render`, phat hien **2 loi nghiem trong**:

### Loi 1: Ky tu xuong dong trong the meta lam hong HTML
Ham `escHtml()` khong xu ly ky tu xuong dong (`\n`). Khi noi dung bai viet co xuong dong, the `og:description` se chua ky tu xuong dong tho trong attribute `content="..."`, lam Facebook khong doc duoc cac the meta phia sau (bao gom `og:image`).

Vi du loi (output thuc te tu edge function):
```html
<meta property="og:description" content="Con thua Cha...
Con xin sam hoi...">
```
Facebook doc den dong dau, gap xuong dong thi dung lai --> bo qua `og:image`.

### Loi 2: Code dung sai ten cot `media_url` (khong ton tai)
Dong 226 trong seo-render:
```typescript
image: post.image_url || post.media_url || post.profile?.avatar_url || DEFAULT_IMAGE
```
Bang `posts` khong co cot `media_url`. Cac cot dung la:
- `image_url` (text) -- anh chinh
- `video_url` (text) -- video
- `media_urls` (jsonb) -- mang cac media items

Ket qua: post khong co `image_url` se luon fallback ve avatar (hinh nho) hoac logo mac dinh.

## Giai phap

### Thay doi 1: Fix ham `escHtml` - thay xuong dong bang khoang trang
Them xu ly ky tu `\n` va `\r` trong ham `escHtml()` de dam bao meta tags luon nam tren 1 dong.

### Thay doi 2: Fix logic chon hinh cho bai viet
Tao ham helper `extractPostImage()` de lay hinh tu nhieu nguon theo thu tu uu tien:
1. `image_url` -- anh chinh cua bai viet
2. `media_urls` -- lay anh dau tien tu mang media (chi lay type = 'image')
3. `video_url` -- bo qua (Facebook khong hien thi video lam og:image)
4. `profile.avatar_url` -- avatar nguoi dang
5. `DEFAULT_IMAGE` -- logo FUN Profile

## Chi tiet ky thuat

### File: `supabase/functions/seo-render/index.ts`

**Thay doi 1** - Ham `escHtml` (dong 113-119):
```typescript
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\r\n]+/g, " ")
    .trim();
}
```

**Thay doi 2** - Them ham helper extract image tu media_urls:
```typescript
function extractPostImage(post: Record<string, any>): string | null {
  if (post.image_url) return post.image_url;
  if (Array.isArray(post.media_urls)) {
    const img = post.media_urls.find((m: any) => m.type === 'image');
    if (img?.url) return img.url;
  }
  return null;
}
```

**Thay doi 3** - Cap nhat dong 226 (chon hinh cho post):
```typescript
// Truoc (sai ten cot):
image: post.image_url || post.media_url || post.profile?.avatar_url || DEFAULT_IMAGE

// Sau (dung logic):
image: extractPostImage(post) || post.profile?.avatar_url || DEFAULT_IMAGE
```

## Ket qua mong doi
- Meta tags se luon hop le (khong bi xuong dong trong attribute)
- Facebook se doc duoc `og:image` dung
- Bai viet co anh se hien thi anh bai viet
- Bai viet khong co anh se hien thi avatar nguoi dang
- Sau khi deploy, vao Facebook Sharing Debugger bam "Scrape Again" de cap nhat
