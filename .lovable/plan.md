

# Kích Hoạt Tua Video và Tải Xuống cho Live Replay

## Tình Trạng Hiện Tại
- Video live replay lưu trên R2 (media.fun.rich) dưới dạng .webm
- LazyVideo dùng native `<video controls>` cho R2 URLs -- thanh tua (seek bar) **da hoat dong**
- Chua co nut **Tai xuong** (Download) cho nguoi dung

## Thay Doi Can Lam

### 1. Them nut Download vao MediaGrid (cho live replay video)
**File**: `src/components/feed/MediaGrid.tsx`

- Khi video co `isLiveReplay = true`, hien thi them nut Download (icon Arrow Down) o goc phai phia tren video
- Nut Download su dung `<a href={url} download>` de tai truc tiep file .webm tu R2
- Dat canh badge "LIVE Replay" da co san

### 2. Them nut Download vao MediaGalleryViewer
**File**: `src/components/feed/MediaGrid.tsx` (phan MediaGalleryViewer)

- Khi xem video trong gallery fullscreen, them nut Download o thanh toolbar (canh nut Close)
- Chi hien thi cho video, khong hien cho anh

### 3. Dam bao video seek hoat dong tot
**File**: `src/components/ui/StreamPlayer.tsx`

- Voi video direct (R2 .webm), native `<video controls>` da ho tro seek -- khong can thay doi
- Kiem tra preload="metadata" de dam bao seek bar hien thi dung duration

## Chi Tiet Ky Thuat

### Download Logic
```text
- R2 URLs (media.fun.rich): Dung window.open(url) hoac <a download> 
  (do CORS, co the can fetch + blob approach)
- Cloudflare Stream URLs: Khong ho tro download truc tiep
  (chi R2 videos moi co the tai)
```

### Cau truc nut Download
- Icon: `Download` tu lucide-react
- Vi tri: Goc tren ben phai video, canh badge LIVE Replay
- Style: Nut tron voi nen ban trong `bg-black/60 hover:bg-black/80`
- Click handler: `window.open(url, '_blank')` hoac tao `<a>` tag voi attribute `download`

### Files thay doi
1. `src/components/feed/MediaGrid.tsx` -- Them nut Download vao ca inline video va gallery viewer
2. Khong can thay doi backend hay database

