

# Hien thi hinh anh/video cu the khi chia se link len Facebook

## Tinh trang hien tai

He thong `seo-render` (backend function) da duoc cau hinh dung -- khi Facebook bot truy cap link bai viet hoac video, no se tra ve the `og:image` voi hinh anh tuong ung. **Tuy nhien**, cac dialog chia se trong app dang tao link sai:

1. **ShareReelDialog** -- dang tao link `/reels/{id}` (ID truc tiep) thay vi `/{username}/video/{slug}` (link SEO-friendly)
2. **LiveSharePanel** -- dang tao link `/live/{sessionId}` thay vi `/{username}/live/{slug}`
3. **Reel interface** thieu truong `slug`, nen khong the tao link slug-based

Khi Facebook bot nhan link `/reels/{id}`, no bi redirect 301 toi link canonical -- Facebook co the khong theo redirect dung, dan toi mat OG tags.

## Giai phap

### Thay doi 1: Them `slug` vao Reel interface va query

File `src/hooks/useReels.ts`:
- Them `slug` vao interface `Reel`
- Them `slug` vao fallback query (dong 71)

### Thay doi 2: Cap nhat ShareReelDialog dung slug URL

File `src/components/reels/ShareReelDialog.tsx`:
- Thay doi prop tu `reelId: string` thanh nhan ca object reel (hoac them `slug` va `username`)
- Dung `getAbsoluteVideoUrl()` tu `src/lib/slug.ts` de tao link dung

```text
Truoc: https://fun.rich/reels/abc-123-id
Sau:   https://fun.rich/username/video/ten_video_slug
```

### Thay doi 3: Cap nhat ReelsFeed truyen du lieu cho ShareReelDialog

File `src/components/reels/ReelsFeed.tsx`:
- Truyen them thong tin `slug` va `username` cho ShareReelDialog

### Thay doi 4: Cap nhat LiveSharePanel dung slug URL

File `src/modules/live/components/LiveSharePanel.tsx`:
- Them props cho `slug` va `username`
- Dung `getAbsoluteLiveUrl()` thay vi hardcode URL

### Thay doi 5: Bo sung og:video tag cho video trong seo-render

File `supabase/functions/seo-render/index.ts`:
- Them the `og:video` vao `buildHTML` khi noi dung la video, de Facebook co the hien thi video player truc tiep trong preview

```text
Them cac the:
  og:video         = video_url
  og:video:type    = video/mp4
  og:video:width   = 720
  og:video:height  = 1280
```

## Chi tiet ky thuat

### File 1: `src/hooks/useReels.ts`
- Dong 6-31: Them `slug: string | null` vao interface Reel
- Dong 71: Them `slug` vao select query

### File 2: `src/components/reels/ShareReelDialog.tsx`
- Doi interface nhan them `slug` va `username`
- Import va dung `getAbsoluteVideoUrl` thay vi hardcode URL
- Them nut "Chia se Facebook" va "Chia se Telegram" giong LiveSharePanel

### File 3: `src/components/reels/ReelsFeed.tsx`
- Dong 200-203: Truyen them `slug` va `username` cho ShareReelDialog

### File 4: `src/modules/live/components/LiveSharePanel.tsx`
- Them props `slug` va `username` (optional)
- Dung `getAbsoluteLiveUrl` khi co slug, fallback ve `/live/{id}`

### File 5: `supabase/functions/seo-render/index.ts`
- Them tham so `videoUrl` vao `buildHTML`
- Khi co `videoUrl`, them cac the `og:video`, `og:video:type`, `og:video:width`, `og:video:height`
- Phan video section truyen `reel.video_url` vao buildHTML

## Ket qua mong doi
- Link bai viet chia se len Facebook se hien hinh anh bai viet (neu co) hoac avatar nguoi dang
- Link video chia se len Facebook se hien thumbnail video va co the hien video player
- Tat ca link deu dung dang SEO-friendly: `fun.rich/username/video/slug`
