

## Kế Hoạch Triển Khai: Immutable Cache Headers + Anti-Hotlinking

Angel đã kiểm tra kỹ hệ thống media hiện tại. Dưới đây là kế hoạch chi tiết để triển khai 2 cải tiến:

---

### Cải Tiến 1: Immutable Cache Headers

**Mục tiêu:** Khi file được upload lên R2, browser sẽ cache vĩnh viễn (1 năm) - không cần request lại server.

**Vì sao an toàn?** Filename của FUN Profile có hash unique (`1738000000-abc123xyz.webp`), nên khi file thay đổi thì URL cũng thay đổi → không lo cache cũ.

**Thay đổi:**

| File | Nội dung thay đổi |
|------|-------------------|
| `supabase/functions/get-upload-url/index.ts` | Thêm `x-amz-meta-cache-control` vào signed headers để R2 lưu Cache-Control metadata |
| `supabase/functions/upload-to-r2/index.ts` | Thêm `Cache-Control: public, max-age=31536000, immutable` header khi upload trực tiếp |

**Kết quả:** Mọi ảnh/video trên `media.fun.rich` sẽ được browser cache 1 năm, giảm request và tăng tốc độ load.

---

### Cải Tiến 2: Anti-Hotlinking Edge Function

**Mục tiêu:** Chặn các website khác "xài chùa" bandwidth của `media.fun.rich`.

**Cách hoạt động:**
1. Tạo edge function `media-proxy` kiểm tra `Referer` header
2. Chỉ cho phép request từ các domain được whitelist
3. Request không có Referer hoặc từ domain lạ → trả về 403 Forbidden

**Whitelist domains:**
- `fun.rich`, `www.fun.rich`
- `funprofile.lovable.app` (preview)
- `*.lovable.app` (Lovable preview domains)
- `*.vercel.app` (Vercel preview)
- Request không có Referer (direct access) → cho phép (để browser load được)

**Thay đổi:**

| File | Nội dung |
|------|----------|
| `supabase/functions/media-guard/index.ts` | **Tạo mới** - Edge function kiểm tra Referer và chặn hotlinking |
| `supabase/config.toml` | Thêm config cho `media-guard` function |

**Lưu ý quan trọng:** 
- Edge function này sẽ là một layer bảo vệ bổ sung
- Trong thực tế, để chống hotlinking hoàn toàn cần cấu hình trên Cloudflare Dashboard (Transform Rules hoặc Workers)
- Edge function này sẽ validate requests đến từ FUN Profile app trước khi trả về signed URLs

---

### Chi Tiết Kỹ Thuật

**1. Cập nhật `get-upload-url/index.ts`:**
```typescript
// Thêm Cache-Control vào response metadata
// Khi client upload, R2 sẽ lưu metadata này
return new Response(
  JSON.stringify({ 
    uploadUrl,
    publicUrl: filePublicUrl,
    key,
    expiresIn,
    cacheControl: 'public, max-age=31536000, immutable', // Hướng dẫn client set header
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

**2. Cập nhật `r2Upload.ts` (client):**
```typescript
// Khi upload, thêm Cache-Control header
const response = await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
});
```

**3. Tạo `media-guard/index.ts`:**
```typescript
// Kiểm tra Referer header
const ALLOWED_ORIGINS = [
  'fun.rich',
  'www.fun.rich', 
  'funprofile.lovable.app',
  '.lovable.app',
  '.vercel.app',
];

// Logic kiểm tra
const referer = req.headers.get('Referer');
if (referer) {
  const refererHost = new URL(referer).hostname;
  const isAllowed = ALLOWED_ORIGINS.some(origin => 
    origin.startsWith('.') 
      ? refererHost.endsWith(origin) 
      : refererHost === origin
  );
  if (!isAllowed) {
    return new Response('Forbidden', { status: 403 });
  }
}
```

---

### Tổng Kết File Cần Thay Đổi

| File | Hành động |
|------|-----------|
| `supabase/functions/get-upload-url/index.ts` | Chỉnh sửa - thêm cache metadata |
| `supabase/functions/upload-to-r2/index.ts` | Chỉnh sửa - thêm Cache-Control header |
| `src/utils/r2Upload.ts` | Chỉnh sửa - thêm Cache-Control khi upload |
| `supabase/functions/media-guard/index.ts` | **Tạo mới** - Anti-hotlinking guard |
| `supabase/config.toml` | Chỉnh sửa - thêm config media-guard |

---

### Lợi Ích Sau Triển Khai

| Metric | Trước | Sau |
|--------|-------|-----|
| Browser Cache | Không có | 1 năm (immutable) |
| Repeat Page Load | Request lại server | Instant từ cache |
| Hotlinking Protection | Không có | Chặn domain lạ |
| Bandwidth Cost | Có thể bị lạm dụng | Được bảo vệ |

