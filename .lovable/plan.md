

# Hien thi hinh anh khi chia se link Fun.rich len Facebook

## Van de goc

### 1. Hinh mac dinh qua nho
File `fun-profile-logo-128.webp` chi co 128x128 pixel. Facebook yeu cau **toi thieu 200x200px** de hien thi hinh. Vi vay Facebook bo qua hinh va chi hien text.

### 2. Bot Facebook khong duoc dinh tuyen den seo-render
File `_redirects` hien tai chi co 1 dong:
```
/* /index.html 200
```
Tat ca request (ke ca bot Facebook) deu nhan `index.html` tinh voi OG tags mac dinh. Edge function `seo-render` (da co san, ho tro hinh dong theo bai viet) KHONG BAO GIO duoc goi.

## Giai phap

### Thay doi 1: Tao hinh OG mac dinh kich thuoc chuan
Dung `pwa-512.png` (512x512, da co san) lam hinh OG mac dinh thay vi `fun-profile-logo-128.webp`. Kich thuoc 512x512 du lon de Facebook hien thi.

### Thay doi 2: Cap nhat OG image trong `index.html`
Thay doi `og:image` va `twitter:image` tro den hinh lon hon, dong thoi cap nhat `og:image:width` va `og:image:height`.

### Thay doi 3: Cap nhat DEFAULT_IMAGE trong `seo-render/index.ts`
Doi fallback image sang hinh lon hon de khi seo-render duoc goi, hinh mac dinh cung du lon.

### Thay doi 4: Cap nhat DEFAULT_IMAGE trong `SEOHead.tsx`
Dong bo fallback image trong component SEOHead.

## Chi tiet ky thuat

### File 1: `index.html`
Thay doi dong 31-33 va 42:
```html
<!-- Truoc -->
<meta property="og:image" content="https://fun.rich/fun-profile-logo-128.webp" />
<meta property="og:image:width" content="128" />
<meta property="og:image:height" content="128" />
<meta name="twitter:image" content="https://fun.rich/fun-profile-logo-128.webp" />

<!-- Sau -->
<meta property="og:image" content="https://fun.rich/pwa-512.png" />
<meta property="og:image:width" content="512" />
<meta property="og:image:height" content="512" />
<meta name="twitter:image" content="https://fun.rich/pwa-512.png" />
```

### File 2: `supabase/functions/seo-render/index.ts`
Thay doi dong 4:
```typescript
// Truoc
const DEFAULT_IMAGE = `${DOMAIN}/fun-profile-logo-128.webp`;
// Sau
const DEFAULT_IMAGE = `${DOMAIN}/pwa-512.png`;
```

### File 3: `src/components/seo/SEOHead.tsx`
Thay doi dong trong useEffect:
```typescript
// Truoc
const ogImage = image || `${PRODUCTION_DOMAIN}/fun-profile-logo-128.webp`;
// Sau
const ogImage = image || `${PRODUCTION_DOMAIN}/pwa-512.png`;
```

## Luu y ve hinh dong (hinh bai viet, avatar)
Hien tai bot Facebook luon nhan `index.html` tinh nen chi thay hinh mac dinh. De hien thi hinh **dong** (hinh cua tung bai viet), can cau hinh tai tang hosting (Cloudflare Workers) de phat hien bot va chuyen den edge function `seo-render`. Day la buoc rieng biet, can thuc hien tren Cloudflare dashboard cua domain `fun.rich`.

## Ket qua mong doi
- Tat ca link fun.rich khi chia se len Facebook se hien thi **logo FUN Profile 512x512** (thay vi khong co hinh)
- Hinh se hien dang **summary** (hinh vuong) vi 512x512 khong phai ty le 1200x630
- Khi cau hinh bot routing sau nay, hinh se tu dong chuyen sang hinh dong cua bai viet (1200x630, hien thi lon nhu YouTube)
