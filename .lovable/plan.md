
# Sửa lỗi Facebook `/share/p/` và `/share/v/` không trả về metadata

## Phân tích gốc rễ

Từ logs thực tế:
- `/share/r/` (reels) → `facebookexternalhit` redirect thành `/reel/ID` → **hoạt động** ✅
- `/share/p/` (post) → `facebookexternalhit` KHÔNG redirect, chỉ `Mozilla` redirect → `m.facebook.com/share/p/...` → **login wall** ❌
- `/share/v/` (video) → tương tự, redirect về `m.facebook.com` → **login wall** ❌

Vấn đề trong code: sau khi `resolveFacebookRedirect` trả về URL `m.facebook.com`, hàm `scrapePageMeta` chỉ thử URL đã resolve + variant `m.facebook.com` (nhưng đã là m.facebook.com rồi). **Không bao giờ thử lại URL gốc `www.facebook.com`** với các crawl UA.

## Giải pháp

### File: `supabase/functions/fetch-link-preview/index.ts`

**1. Sửa `urlsToTry`** để luôn bao gồm cả URL gốc lẫn URL đã resolve:

```typescript
const urlsToTry = isFacebook 
  ? [resolvedUrl, url, resolvedUrl.replace('www.facebook.com', 'm.facebook.com')]
      .filter((v, i, a) => a.indexOf(v) === i) // dedupe
  : [resolvedUrl];
```

**2. Sửa `resolveFacebookRedirect`** — thêm filter cho redirect đến `m.facebook.com/share/` (redirect vô ích):

```typescript
if (location && location.startsWith('http') && !location.includes('/login')
    && !/m\.facebook\.com\/share\//i.test(location)) {
  // Chỉ chấp nhận redirect nếu KHÔNG phải m.facebook.com/share/ (login wall)
}
```

**3. Thêm fallback**: nếu tất cả UA đều thất bại trên share links, thử chuyển đổi URL format:
- `/share/p/ID` → `/permalink.php?story_fbid=ID` (một số ID hoạt động)
- Hoặc thử fetch trực tiếp original URL với `facebookexternalhit` (bỏ qua redirect)

Kết quả: Hệ thống sẽ thử URL gốc `www.facebook.com/share/p/...` trực tiếp với `facebookexternalhit` — UA này có thể nhận OG data mà không cần redirect.

Sửa ~10 dòng, deploy lại edge function.
