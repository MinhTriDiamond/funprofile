

# Sua loi Facebook khong hien hinh anh khi chia se link

## Phan tich nguyen nhan

Sau khi kiem tra ky, co **2 van de chinh**:

### Van de 1: `vercel.json` thieu nhieu route cho bot crawler
File `vercel.json` hien tai chi co 3 rewrite cho bot:
- `/:username/post/:slug`
- `/:username/video/:slug`
- `/:username/live/:slug`

**Thieu cac route quan trong:**
- `/:username` (trang ca nhan) -- khi chia se profile
- `/post/:id` (link post truc tiep khi khong co slug)
- `/reels/:id` (link video truc tiep)
- `/live/:id` (link live truc tiep)
- `/` (trang chu)

### Van de 2: Facebook cache hinh cu
Facebook luu cache OG tags. Du da doi hinh tu `fun-profile-logo-128.webp` (128px) sang `pwa-512.png` (512px), Facebook van dung cache cu. Can vao Facebook Sharing Debugger de "Scrape Again".

## Giai phap

### Thay doi 1: Bo sung tat ca route bot vao `vercel.json`
Them cac rewrite cho bot crawler de cover **tat ca** cac loai URL:

```text
Truoc (3 rewrites):
  /:username/post/:slug  -->  seo-render
  /:username/video/:slug -->  seo-render
  /:username/live/:slug  -->  seo-render

Sau (7 rewrites):
  /                      -->  seo-render  (trang chu)
  /post/:id              -->  seo-render  (post truc tiep)
  /reels/:id             -->  seo-render  (video truc tiep)
  /live/:id              -->  seo-render  (live truc tiep)
  /:username             -->  seo-render  (profile)
  /:username/post/:slug  -->  seo-render  (post co slug)
  /:username/video/:slug -->  seo-render  (video co slug)
  /:username/live/:slug  -->  seo-render  (live co slug)
```

Moi rewrite deu co dieu kien kiem tra `user-agent` cua bot (Facebook, Google, Twitter...) -- nguoi dung binh thuong van vao SPA nhu cu.

### Thay doi 2: Bo sung route trong `seo-render` edge function
Them xu ly cho trang chu `/` de tra ve OG tags mac dinh khi bot truy cap homepage.

## Chi tiet ky thuat

### File 1: `vercel.json`
Them 5 rewrite moi truoc cac rewrite hien co. Thu tu quan trong -- cac route cu the hon phai nam truoc route chung:

1. `/` (homepage) -- bot rewrite
2. `/post/:id` -- bot rewrite
3. `/reels/:id` -- bot rewrite
4. `/live/:id` -- bot rewrite
5. `/:username/post/:slug` -- (da co)
6. `/:username/video/:slug` -- (da co)
7. `/:username/live/:slug` -- (da co)
8. `/:username` -- bot rewrite (phai nam SAU cac route cu the de tranh xung dot)
9. `/(.*) -> /index.html` -- catch-all cho SPA (da co)

### File 2: `supabase/functions/seo-render/index.ts`
Kiem tra va dam bao route `/` (homepage) tra ve OG tags day du voi hinh `pwa-512.png`.

## Huong dan sau khi deploy

Sau khi code duoc deploy len Vercel:
1. Vao [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Dan link `https://fun.rich` hoac link bai viet
3. Bam "Debug" roi bam "Scrape Again" de Facebook lay OG tags moi
4. Kiem tra hinh anh da hien thi chua

## Ket qua mong doi
- Tat ca link fun.rich khi chia se len Facebook deu hien thi hinh anh
- Link bai viet se hien thi hinh cua bai viet (neu co) hoac avatar nguoi dang
- Link profile se hien thi avatar nguoi dung
- Link khong co hinh se hien thi logo FUN Profile 512x512
