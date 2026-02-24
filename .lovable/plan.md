

# Hien thi hinh anh khi chia se link Fun.rich len mang xa hoi

## Van de hien tai

Khi chia se link fun.rich len Facebook hoac mang xa hoi khac, chi hien thi dong chu "FUN.RICH - Connect, Share, Earn" ma **khong co hinh anh** vi:

1. **`index.html` thieu the OG**: File HTML goc khong co bat ky the `og:image`, `og:title`, `og:description` nao. Crawler (Facebook, Twitter...) khong chay JavaScript nen khong thay duoc cac the do `SEOHead` component tao ra.

2. **`seo-render` edge function** da co san nhung **chua duoc ket noi voi routing** -- bot crawler khong duoc chuyen huong den edge function nay.

3. **Thieu kich thuoc hinh** (`og:image:width`, `og:image:height`) -- Facebook can thong tin nay de hien thi hinh lon (summary_large_image).

## Giai phap

### 1. Them default OG tags vao `index.html`
Them cac the meta OG mac dinh de moi link fun.rich deu co hinh anh khi chia se. Su dung logo FUN Profile lam hinh mac dinh.

### 2. Nang cap `seo-render` edge function
- Them `og:image:width` va `og:image:height` (1200x630 la kich thuoc chuan cho Facebook large image)
- Cho post co hinh: dung hinh cua post
- Cho post khong hinh: dung avatar nguoi dang
- Fallback: dung logo FUN Profile

### 3. Nang cap `SEOHead.tsx` component
Them `og:image:width` va `og:image:height` de khi prerender hoat dong, hinh se hien thi dung kich thuoc lon.

### 4. Tao hinh OG mac dinh kich thuoc chuan
Hien tai chi co `fun-profile-logo-128.webp` (128x128) -- qua nho. Can dung hinh lon hon (toi thieu 600x315, ly tuong 1200x630).

## Chi tiet ky thuat

### File 1: `index.html`
Them cac the meta OG mac dinh vao `<head>`:
```html
<!-- Open Graph defaults -->
<meta property="og:title" content="FUN.RICH - Connect, Share, Earn">
<meta property="og:description" content="FUN Profile - Mang xa hoi Web3 ket hop AI. Ket noi ban be, chia se noi dung, kiem phan thuong.">
<meta property="og:image" content="https://fun.rich/fun-profile-logo-128.webp">
<meta property="og:image:width" content="128">
<meta property="og:image:height" content="128">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FUN Profile">
<meta property="og:url" content="https://fun.rich">

<!-- Twitter Card defaults -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="FUN.RICH - Connect, Share, Earn">
<meta name="twitter:description" content="FUN Profile - Mang xa hoi Web3 ket hop AI.">
<meta name="twitter:image" content="https://fun.rich/fun-profile-logo-128.webp">
```

### File 2: `supabase/functions/seo-render/index.ts`
Them `og:image:width` va `og:image:height` vao buildHTML:
```html
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

Cai thien logic chon hinh cho post:
- Uu tien: `image_url` -> `media_urls[0]` -> avatar nguoi dang -> logo FUN Profile

### File 3: `src/components/seo/SEOHead.tsx`
Them `og:image:width` va `og:image:height` vao useEffect:
```typescript
setMeta('property', 'og:image:width', '1200');
setMeta('property', 'og:image:height', '630');
```

### Luu y quan trong
- Viec nay se giup **tat ca link fun.rich** deu co hinh khi chia se (it nhat la logo mac dinh)
- De hinh **dong** (hinh cua tung bai post, avatar user) hien thi tren Facebook, can cau hinh domain `fun.rich` de chuyen bot traffic den `seo-render` edge function. Dieu nay can thiet lap tren Cloudflare Workers hoac tuong tu tai tang hosting.
- Sau khi deploy, co the dung [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) de kiem tra va lam moi cache OG tags.

