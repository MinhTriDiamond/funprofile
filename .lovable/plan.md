

# Loai Bo Service Worker (PWA) De Sync Deploy Nhanh Hon

## Van De
Service Worker (do `vite-plugin-pwa`) dang cache tat ca file JS/CSS/HTML trong browser. Khi deploy phien ban moi tren Cloudflare Pages, nguoi dung van thay phien ban cu vi SW tra ve tu cache local, phai doi SW tu cap nhat hoac hard refresh.

## Giai Phap
Xoa hoan toan PWA/Service Worker. Cloudflare Pages da tu dong xu ly caching tot:
- Asset co hash (JS/CSS): immutable, cache lau dai
- HTML: luon tra ban moi nhat moi khi deploy

## Cac buoc thuc hien

### 1. `vite.config.ts`
- Xoa import `VitePWA` tu `vite-plugin-pwa`
- Xoa toan bo block `VitePWA({...})` trong mang plugins (khoang 50 dong)
- Giu nguyen cac cau hinh khac (react, tagger, build optimization)

### 2. `index.html`
- Xoa the `<link rel="manifest" href="/manifest.webmanifest" />`
- Xoa 3 meta PWA: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
- Giu nguyen `theme-color` va `apple-touch-icon` (van huu ich cho bookmark)
- Them script unregister SW cu truoc `</body>` de go SW tren thiet bi nguoi dung cu:

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(r) {
    for (var i of r) i.unregister();
  });
  if ('caches' in window) {
    caches.keys().then(function(n) {
      for (var k of n) caches.delete(k);
    });
  }
}
</script>
```

### 3. Trang `/install` (`src/pages/Install.tsx`)
- Giu nguyen trang nay (huong dan them vao man hinh chinh van hoat dong khong can SW)
- Khong can thay doi gi

## Ket qua sau khi sua
- Khong con Service Worker trong Application tab
- Deploy moi tren CF Pages -> nguoi dung thay ban moi ngay khi reload
- Khong can hard refresh
- Cloudflare Pages tu dong cache asset hashed, tra HTML moi nhat

## Luu y
- File `pwa-192.png`, `pwa-512.png` trong `public/` giu lai (khong anh huong), co the xoa sau
- Script unregister SW chi can giu khoang 1-2 tuan cho tat ca user cu duoc go SW, sau do co the xoa

