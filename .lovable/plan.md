

# Kế hoạch: Hiển thị thời lượng phiên live + Nút tua 15s cho video replay

## Tổng quan
Có 3 yêu cầu:
1. **Phiên live đang diễn ra**: Hiển thị thời gian đã phát (bao nhiêu phút)
2. **Video replay**: Hiển thị thời lượng video
3. **Nút tua tới/lui 15s** khi xem lại livestream replay

---

## Chi tiết kỹ thuật

### 1. Hiển thị thời gian phát live (Live Duration Timer)

**Trang Host (`LiveHostPage.tsx`):**
- Thêm state `liveDuration` với `useEffect` + `setInterval` mỗi 1 giây
- Tính từ `session.started_at` đến hiện tại
- Hiển thị dạng `HH:MM:SS` bên cạnh badge LIVE (dòng 549-559)

**Trang Audience (`LiveAudiencePage.tsx`):**
- Tương tự, thêm timer hiển thị thời gian phát từ `session.started_at`
- Hiển thị bên cạnh badge LIVE (dòng 128-136)

**Trang Discovery (`LiveDiscoveryPage.tsx`):**
- Đã có `formatDistanceToNow` hiển thị "X phút trước" — giữ nguyên, đủ rồi

### 2. Hiển thị thời lượng video replay trong feed

**`MediaGrid.tsx`:**
- Khi video là `isLiveReplay`, thêm hiển thị thời lượng video
- Lắng nghe sự kiện `onLoadedMetadata` của thẻ `<video>` để lấy `video.duration`
- Hiển thị thời lượng (VD: `12:34`) ở góc dưới phải của video overlay

### 3. Nút tua 15s cho video replay

**`MediaGrid.tsx` — `MediaGalleryViewer`:**
- Khi video đang xem trong gallery viewer là live replay, thêm 2 nút:
  - ⏪ Tua lùi 15s
  - ⏩ Tua tới 15s
- Sử dụng `useRef<HTMLVideoElement>` để điều khiển `video.currentTime += 15` / `-= 15`
- Hiển thị 2 nút ở giữa video overlay (kiểu YouTube)

**`MediaGrid.tsx` — Video đơn trong feed (single media):**
- Khi `isLiveReplay`, thêm 2 nút tua 15s overlay lên video
- Cần ref đến thẻ `<video>` bên trong `LazyVideo` — tuy nhiên `LazyVideo` không expose ref
- **Giải pháp**: Thêm nút tua vào `MediaGalleryViewer` (khi mở xem toàn màn hình) — đây là nơi tốt nhất

### Các file cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/modules/live/pages/LiveHostPage.tsx` | Thêm live duration timer |
| `src/modules/live/pages/LiveAudiencePage.tsx` | Thêm live duration timer |
| `src/components/feed/MediaGrid.tsx` | Thêm nút tua 15s vào `MediaGalleryViewer`, hiển thị duration cho live replay |

### UI chi tiết

**Live Duration Timer:**
```
🔴 LIVE  ⏱ 01:23:45
```
Badge `Clock` icon + thời gian format `HH:MM:SS`, cập nhật mỗi giây.

**Nút tua trong MediaGalleryViewer:**
```
     ⏪15      ▶      15⏩
```
2 nút tròn bán trong suốt ở 2 bên video, icon `RotateCcw` và `RotateCw` từ lucide-react, có text "15" nhỏ.

**Thời lượng video replay:**
Hiển thị ở góc dưới phải overlay: `12:34` trên nền đen mờ, chỉ cho `isLiveReplay`.

