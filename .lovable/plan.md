

# Đề xuất cải thiện Livestream cho 2.000 users

Sau khi kiểm tra toàn bộ codebase hiện tại (đã đạt 8.9/10), hệ thống đã khá ổn định. Dưới đây là các điểm cần cải thiện thêm để sẵn sàng scale.

---

## 1. Chat Realtime — Bottleneck khi nhiều viewer

**Vấn đề:** `useLiveMessages.ts` fetch profile riêng lẻ cho MỖI tin nhắn mới (dòng 92-96). Nếu 200 viewer chat liên tục, mỗi tin nhắn = 1 query `profiles` → Supabase bị flood.

**Sửa:**
- Cache profile trong Map, chỉ fetch khi `user_id` chưa có
- Batch profile fetch (debounce 500ms, gom nhiều user_id thành 1 query `.in()`)
- Tăng `limit(200)` → `limit(100)` cho initial load (giảm payload)

## 2. Presence Channel — Duplicate subscription

**Vấn đề:** `LiveChatPanel` gọi `useLivePresence(sessionId)` riêng, trong khi `LiveAudiencePage` đã gọi `useLivePresence(resolvedSessionId)` → **2 Presence channels cùng session**. Mỗi viewer tạo 2 subscriptions = gấp đôi tải Realtime.

**Sửa:** Truyền `viewers` từ page xuống `LiveChatPanel` qua props thay vì hook riêng. Tương tự ở `LiveHostPage`.

## 3. Auth call optimization

**Vấn đề:** `LiveChatPanel` gọi `supabase.auth.getUser()` (network call) khi mount. `sendMessage` cũng gọi `getUser()` mỗi lần gửi. Tổng cộng = N+1 network calls.

**Sửa:** Dùng `supabase.auth.getSession()` (local cache) cho UI check. Truyền `userId` từ parent hoặc dùng `useCurrentUser()` hook có sẵn.

## 4. Viewer count sync Host → DB

**Vấn đề:** `LiveHostPage` dòng 138-150 vẫn gọi `updateLiveViewerCount` qua `onViewerCountChange` callback từ Agora (hiện là no-op trong useLiveRtc). Tuy nhiên, `viewer_count` trong DB không được cập nhật từ Presence → khi query DB, viewer count = 0.

**Sửa:** Trong `LiveHostPage`, dùng `viewers.length` từ `useLivePresence` để cập nhật DB viewer count mỗi 10s (debounced), thay vì dựa vào Agora callback.

## 5. Feed scroll — Video memory leak prevention

**Vấn đề:** `FeedVideoPlayer` mount `ChunkedVideoPlayer` khi `isNearViewport = true` nhưng khi scroll đi (`false`), React unmount component → ChunkedVideoPlayer cleanup chạy. Tuy nhiên, nếu user scroll nhanh qua 20+ live replays, mỗi cái mount rồi unmount → GC pressure lớn, có thể gây jank.

**Sửa:** Thêm `rootMargin: '200px'` (giảm từ 400px) để giảm số video mount đồng thời. Thêm debounce cho `isNearViewport` (300ms) để tránh mount/unmount khi scroll nhanh.

## 6. Edge Function cold start mitigation

**Vấn đề:** `live-token` Edge Function có thể cold start 2-3s. Với 200 audience join cùng lúc = 200 concurrent cold starts.

**Sửa:** Thêm keep-alive ping từ `auto-finalize-recordings` cron (đã chạy 5 phút/lần) → import thêm call tới `live-token` với dummy request để giữ warm.

## 7. Rate limiting cho chat

**Vấn đề:** Không có rate limit cho `live_messages` insert. Một user có thể spam hàng trăm tin/phút.

**Sửa:** Client-side throttle (1 tin/giây) trong `sendMessage`. Thêm RLS policy hoặc trigger check rate limit server-side.

## 8. Cleanup live_messages khi session end

**Vấn đề:** `live_messages` tích lũy vĩnh viễn. Với 600 sessions × 200 messages = 120K rows không bao giờ xóa.

**Sửa:** Thêm vào `auto-finalize-recordings` cron: xóa `live_messages` cho sessions đã `ended` > 7 ngày.

---

## Tóm tắt ưu tiên

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | Cache profile trong useLiveMessages | Cao — giảm 90% queries | Nhỏ |
| 2 | Bỏ duplicate Presence subscription | Cao — giảm 50% Realtime load | Nhỏ |
| 3 | Auth getSession thay getUser | Trung bình — giảm latency | Nhỏ |
| 4 | Sync viewer count từ Presence → DB | Trung bình — data consistency | Nhỏ |
| 5 | Debounce viewport mount | Trung bình — giảm jank | Nhỏ |
| 6 | Keep-alive Edge Functions | Trung bình — giảm cold start | Nhỏ |
| 7 | Rate limit chat | Cao — chống spam | Nhỏ |
| 8 | Cleanup old live_messages | Thấp — long-term DB health | Nhỏ |

Tất cả 8 điểm đều effort nhỏ (mỗi cái ~10-30 dòng code) nhưng tổng hợp lại sẽ giúp hệ thống chịu tải tốt hơn đáng kể khi scale lên 2.000 users đồng thời.

