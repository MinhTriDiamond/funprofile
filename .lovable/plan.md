
# Fix hien thi hinh anh bai viet khi chia se len Facebook

## Ket qua kiem tra

Cha da test truc tiep edge function `seo-render` voi bai viet cua con (`happy_new_year_tet_vui_ve_tet_giau_co_vui_ve_va_giau_co_fun`) va ket qua cho thay **edge function da hoat dong dung**:

- `og:image` tra ve la avatar cua nguoi dang (vi bai viet nay khong co hinh anh dinh kem)
- Bai viet co hinh thi `og:image` tra ve hinh bai viet dung

## Nguyen nhan Facebook van hien logo cu

**Van de chinh: Vercel chua duoc deploy code moi.** File `vercel.json` da duoc cap nhat trong Lovable nhung chua duoc deploy len domain `fun.rich`. Khi Facebook bot truy cap `fun.rich`, Vercel van dung cau hinh cu (khong co rewrite cho bot) nen Facebook nhan `index.html` tinh voi logo mac dinh.

## Nhung gi can lam

### Thay doi 1: Fix bug trong `src/pages/Post.tsx` (client-side SEO)
File nay van dung `post.media_url` (cot khong ton tai). Can doi thanh logic giong `extractPostImage` trong edge function de client-side SEO cung dung.

```text
Truoc:
  image: post.image_url || post.media_url    (2 cho)

Sau:
  image: post.image_url || firstMediaImage   (lay tu media_urls)
```

### Thay doi 2: Fix jsonLd image trong edge function
Dong 245 trong `seo-render/index.ts` van dung `post.media_url` cu:
```text
Truoc:  image: post.image_url || post.media_url
Sau:    image: extractPostImage(post) || post.profile?.avatar_url || DEFAULT_IMAGE
```

### Sau khi deploy len Vercel
Sau khi code moi duoc deploy len domain `fun.rich` (qua Vercel), con can:
1. Vao [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Dan link bai viet, vd: `https://fun.rich/angelaivan/post/happy_new_year_tet_vui_ve_tet_giau_co_vui_ve_va_giau_co_fun`
3. Bam **"Debug"** roi bam **"Scrape Again"**
4. Facebook se lay OG tags moi va hien thi hinh dung

## Luu y
- Bai viet `happy_new_year...` khong co hinh anh dinh kem trong database (image_url = null, media_urls = []), nen se hien thi **avatar nguoi dang** thay vi hinh bai viet
- Bai viet co hinh (vi du bai `nha_cha_mon_gi_cung_dac_biet...`) se hien thi **hinh bai viet** dung

## Chi tiet ky thuat

### File 1: `src/pages/Post.tsx`
Thay 2 cho dung `post.media_url`:
```typescript
// Tao bien helper
const firstMediaImage = Array.isArray(post.media_urls)
  ? post.media_urls.find((m: any) => m.type === 'image')?.url
  : null;

// Dong 87 va 92:
image: post.image_url || firstMediaImage || null,
```

### File 2: `supabase/functions/seo-render/index.ts`
Dong 245 (trong jsonLd):
```typescript
// Truoc
image: post.image_url || post.media_url,
// Sau
image: extractPostImage(post) || post.profile?.avatar_url || DEFAULT_IMAGE,
```
