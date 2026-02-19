
## Phân tích vấn đề

### 1. Facebook avatar không hiển thị
Edge function trả về URL dạng `https://graph.facebook.com/{username}/picture?type=large&redirect=true`. URL này redirect đến Facebook CDN (fbcdn.net). Khi browser dùng URL này làm `src` của `<img>`, có 2 vấn đề:
- Facebook CDN áp dụng CORS restriction — browser bị chặn
- Facebook đã thắt chặt API: với username dạng text (không phải numeric ID), Graph API thường trả về ảnh placeholder mặc định, không phải ảnh cá nhân thật

### 2. Zalo avatar không fetch
Trong `AvatarOrbit.tsx` dòng 149:
```js
const NO_AVATAR_PLATFORMS = ['zalo', 'funplay'];
```
Zalo bị đặt vào danh sách không fetch avatar, nên luôn dùng logo. Tuy nhiên, Zalo có API công khai:
- URL profile Zalo: `https://zalo.me/0xxxxxxxxx` → có thể scrape og:image
- Thực tế Zalo trả về ảnh profile trong og:image (không bị filter như trước đây)

### 3. Logic fetch chỉ chạy cho `isOwner`
Dòng 153: `if (!isOwner || !userId) return;` — Khách xem profile không bao giờ thấy avatar được fetch, kể cả khi đã lưu vào DB. Đây là hành vi đúng (chỉ refresh khi owner), nhưng vấn đề là Facebook avatar bị lưu sai (URL Graph API thay vì URL ảnh thật).

## Giải pháp

### Bước 1: Sửa Edge Function `fetch-link-preview`
**Facebook:** Thay vì trả URL redirect, cần fetch ảnh thật qua proxy:
- Gọi `https://graph.facebook.com/{username}/picture?type=large` với `redirect=false` để lấy URL ảnh thật
- Sau đó proxy ảnh đó về client (hoặc trả URL proxy)
- Nếu Facebook trả lỗi/placeholder → thử scrape og:image từ trang profile

**Zalo:** Bỏ khỏi `NO_AVATAR_PLATFORMS`, thêm logic scrape og:image từ `zalo.me/{phone}`:
- Zalo og:image trên mobile-friendly page thường chứa ảnh đại diện thật
- Filter bỏ ảnh xấu (`stc-zlogin.zdn.vn`) đã có sẵn trong `BAD_PATTERNS`

### Bước 2: Sửa `AvatarOrbit.tsx` — cách hiển thị Facebook
- Facebook avatarUrl lưu trong DB là URL Graph API → khi render dùng **proxy endpoint** của chính edge function thay vì URL trực tiếp
- Proxy endpoint đã có sẵn: `GET /fetch-link-preview?proxy=<encoded_url>`

### Bước 3: Sửa `AvatarOrbit.tsx` — cho phép Zalo fetch avatar
- Bỏ `zalo` ra khỏi `NO_AVATAR_PLATFORMS`
- Thêm `zalo` vào logic fetch (dùng scrapeOgImage)

## Thay đổi cụ thể

### File 1: `supabase/functions/fetch-link-preview/index.ts`

**Facebook logic mới:**
```typescript
if (platform === 'facebook') {
  const username = extractUsername(normalizedUrl, 'facebook');
  if (username) {
    // Step 1: Gọi Graph API với redirect=false để lấy URL ảnh thật
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(username)}/picture?type=large&redirect=false`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        // Response: { data: { is_silhouette: bool, url: string } }
        if (meta?.data?.url && !meta?.data?.is_silhouette) {
          avatarUrl = meta.data.url; // URL ảnh thật từ fbcdn.net
        }
      }
    } catch { /* ignore */ }
    
    // Step 2: Fallback — scrape og:image từ trang profile
    if (!avatarUrl) {
      avatarUrl = await scrapeOgImage(normalizedUrl);
    }
    
    // Step 3: Fallback cuối — trả URL proxy qua edge function
    if (!avatarUrl) {
      avatarUrl = `https://graph.facebook.com/${encodeURIComponent(username)}/picture?type=large&redirect=true`;
    }
  }
}
```

**Zalo logic mới:**
- Xoá `zalo` khỏi bất kỳ hardcode "skip" nào trong edge function
- Zalo sẽ rơi vào nhánh scrape og:image (vì không có trong `UNAVATAR_MAP` và không phải `facebook`)
- Cập nhật `BAD_PATTERNS` để lọc tốt hơn ảnh xấu của Zalo

### File 2: `src/components/profile/AvatarOrbit.tsx`

**Bỏ Zalo khỏi NO_AVATAR_PLATFORMS:**
```typescript
// Trước
const NO_AVATAR_PLATFORMS = ['zalo', 'funplay'];
// Sau  
const NO_AVATAR_PLATFORMS = ['funplay'];
```

**Hiển thị Facebook avatar qua proxy:**
Khi `link.platform === 'facebook'` và `link.avatarUrl` là URL Graph API (có `graph.facebook.com`), dùng proxy của edge function để tránh CORS:
```typescript
function getDisplayAvatarUrl(link: SocialLink): string | undefined {
  if (!link.avatarUrl) return undefined;
  // Facebook CDN URLs bị CORS — proxy qua edge function
  if (link.avatarUrl.includes('graph.facebook.com') || link.avatarUrl.includes('fbcdn.net')) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/fetch-link-preview?proxy=${encodeURIComponent(link.avatarUrl)}`;
  }
  return link.avatarUrl;
}
```

**Trigger re-fetch cho links hiện tại:**
Logic refetch hiện tại có điều kiện:
```typescript
if (l.avatarUrl && BAD_AVATAR_URLS.some(d => l.avatarUrl!.includes(d))) return true;
if (!l.avatarUrl) return true;
```
Cần thêm: nếu là Zalo và không có avatarUrl → fetch; nếu là Facebook và avatarUrl là URL Graph API → re-fetch để lấy URL ảnh thật.

## Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/fetch-link-preview/index.ts` | Facebook: dùng `redirect=false` để lấy URL ảnh thật; Zalo: bỏ skip, scrape og:image |
| `src/components/profile/AvatarOrbit.tsx` | Bỏ zalo khỏi NO_AVATAR_PLATFORMS; proxy Facebook avatar qua edge function; trigger re-fetch cho Zalo links chưa có avatar |
