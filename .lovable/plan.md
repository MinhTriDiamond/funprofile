

# Tích hợp Chunk-seekable MSE Scrubbing

## Tóm tắt

Thay thế toàn bộ `src/modules/live/components/ChunkedVideoPlayer.tsx` bằng phiên bản mới từ file upload. Phiên bản mới nâng cấp đáng kể khả năng **tua video (seeking)** cho live replay.

## Cải tiến chính so với phiên bản hiện tại

| Tính năng | Hiện tại | Mới |
|---|---|---|
| Seek | Fetch tuần tự, không clear buffer cũ | Debounced seek, clear buffer quanh target, fetch target-first |
| Append queue | Tuần tự theo `nextAppendSeq` | Priority queue (high/normal/low) cho phép append bất kỳ chunk nào trước |
| Timeline | Dựa vào `duration_ms` cố định | `normalizeTimeline()` với binary search, hỗ trợ `startMs/endMs`, fallback ước lượng |
| Buffer eviction | Chỉ evict phía trước playhead | Sliding window: evict behind + far-ahead trim |
| Recovery | Blob fallback | Blob fallback + MSE self-recovery (tái khởi tạo MSE 1 lần trước khi fallback blob) |
| Seek UI | Không có | Hiển thị "Seeking..." overlay khi đang tua |

## Thay đổi

### File duy nhất: `src/modules/live/components/ChunkedVideoPlayer.tsx`
- Thay toàn bộ nội dung bằng code từ file upload (dòng 7-1153)
- Giữ nguyên export interface (`ChunkedVideoPlayerProps`) — không ảnh hưởng các component import nó (`FeedVideoPlayer`, lazy import)

## Không thay đổi
- `FeedVideoPlayer.tsx`, `SocialVideoPlayer`, `FacebookVideoPlayer`
- Backend, edge functions, manifest format
- Các component khác import `ChunkedVideoPlayer`

