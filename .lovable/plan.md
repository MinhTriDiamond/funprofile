

# Fix Video Player Duration + Seek + Livestream Display

## Van de hien tai

### 1. Duration hien thi "--:--" (van de chinh - thay ro trong screenshot)
- Voi video chunked (live replay qua MSE), `video.duration` chi duoc set sau khi `mediaSource.endOfStream()` — tuc la sau khi TAT CA chunk da tai xong
- Truoc do, `video.duration = NaN` hoac `Infinity`, khien `SocialVideoPlayer` hien thi `--:--`
- Manifest da co truong `total_duration_ms` nhung chua duoc su dung

### 2. Progress bar va Seek khong hoat dong voi chunked video
- Vi `duration = 0` (chua co), `validDuration = false` nen progress bar luon o 0%
- Seek bi vo hieu hoa vi khong co duration de tinh toan vi tri

### 3. Livestream posts co the bi mat
- Logic render dung: query khong filter sai, `moderation_status` default la `'approved'`
- Van de tiem an: khi live ket thuc nhung `video_url` chua duoc cap nhat (recording chua xong), post se hien thi nhung khong co video => card bi an do `hasError` trong LazyVideo (return null khi loi)

---

## Ke hoach sua

### File 1: `src/modules/live/components/ChunkedVideoPlayer.tsx`

**Thay doi:** Set `mediaSource.duration` ngay sau `sourceopen` tu manifest data

```text
// Sau dong: const sourceBuffer = mediaSource.addSourceBuffer(mimeWithCodec);
// Them:
const totalDurationSec = manifest.total_duration_ms / 1000;
if (totalDurationSec > 0) {
  mediaSource.duration = totalDurationSec;
}
```

Dieu nay lam cho `video.duration` co gia tri ngay lap tuc, SocialVideoPlayer se:
- Hien thi duration dung (vd: `0:03 / 2:35`)
- Progress bar tinh % chinh xac
- Seek hoat dong (click/drag da co san trong SocialVideoPlayer)

### File 2: `src/components/ui/SocialVideoPlayer.tsx`

**Thay doi 1:** Them polling duration cho truong hop metadata cham

Hien tai chi lang nghe `loadedmetadata` va `durationchange`. Them mot interval ngan (1s) de kiem tra lai `video.duration` trong 5 giay dau, phong truong hop event bi miss:

```text
// useEffect moi:
// Neu sau 3s van chua co duration, thu doc lai video.duration
// Giup voi truong hop MSE set duration muon
```

**Thay doi 2:** Xu ly truong hop LIVE (duration = Infinity)

```text
// Khi duration === Infinity:
// - Hien thi "LIVE" thay vi "--:--"  
// - Disable seek (cursor: not-allowed, khong cho click/drag)
// - An toc do phat va mot so controls khong phu hop
```

### File 3: `src/components/ui/LazyVideo.tsx`

**Thay doi:** Khong return null khi co loi — hien thi placeholder thay vi an card

```text
// Thay vi:
if (hasError) { return null; }

// Doi thanh:
if (hasError) {
  return (
    <div className="relative overflow-hidden bg-muted flex items-center justify-center">
      <AlertTriangle icon + "Video khong the tai duoc"
    </div>
  );
}
```

Dieu nay dam bao post co video loi van hien thi card, khong "bien mat" khoi feed.

### File 4: `src/components/feed/FacebookPostCard.tsx`

**Thay doi:** Khi post la live da ket thuc nhung chua co video_url (recording dang xu ly), hien thi thong bao thay vi de trong:

```text
// Trong mediaItems useMemo:
// Neu isLive && !post.video_url && metadata?.live_status === 'ended':
//   => Khong them media item (dung)
// Nhung o phan render, them truong hop:
// Neu isLive && live_status === 'ended' && mediaItems.length === 0:
//   => Hien thi "Dang xu ly ban ghi..." placeholder
```

---

## Tong ket thay doi

| File | Thay doi | Muc dich |
|------|----------|----------|
| ChunkedVideoPlayer.tsx | Set `mediaSource.duration` tu manifest | Fix duration + progress + seek cho live replay |
| SocialVideoPlayer.tsx | Polling duration fallback + LIVE mode | Dam bao duration luon hien thi; xu ly live stream |
| LazyVideo.tsx | Error placeholder thay vi return null | Khong mat post khi video loi |
| FacebookPostCard.tsx | Placeholder cho live dang xu ly | Khong mat post live chua co recording |

## Ket qua ky vong

- Duration hien thi ngay khi video bat dau tai (vd: `0:00 / 2:35`)
- Progress bar chinh xac, seek hoat dong bang click/drag
- Post live khong bien mat du video loi hay chua xu ly xong
- Khong anh huong video thuong (mp4/webm upload)

