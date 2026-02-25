

# Phân tích & Kế hoạch sửa lỗi: UID_CONFLICT + Số mắt viewer

## 1. Nguyên nhân lỗi `AgoraRTCError UID_CONFLICT`

**Root cause**: Edge function `live-token` gửi `uid: userId` (UUID string) tới Agora Worker. Worker trả về `uid` dạng số (thường là `0` khi không parse được UUID string). Kết quả: **tất cả users đều nhận cùng `uid = 0`**, gây conflict khi join cùng channel.

Xem dòng 103 trong `live-token/index.ts`:
```
uid: String(workerData.uid || workerData.userAccount || 0)
```

Nếu Worker không thể chuyển UUID string thành số, nó trả `uid: 0` → mọi viewer đều join với UID = 0 → UID_CONFLICT.

**Giải pháp**: Sinh UID số duy nhất cho mỗi user bằng cách hash UUID thành số nguyên 32-bit trong edge function, trước khi gửi tới Worker. Mỗi user sẽ có một UID khác nhau.

## 2. Nguyên nhân số mắt (viewer count) không chính xác trên Host

**Root cause**: Host page hiển thị `session.viewer_count` từ database (dòng 567 của `LiveHostPage.tsx`), được cập nhật qua `increment/decrement` RPC. Cơ chế này bị drift khi:
- Viewer refresh trang → decrement không chạy
- Viewer mất mạng → decrement không chạy
- Nhiều tab → increment trùng

Trong khi đó, **Supabase Presence** trong `LiveChatPanel` (thanh "X người đang xem") là chính xác vì nó tự cleanup khi user disconnect.

**Giải pháp**: Host page cũng dùng `useLivePresence` để lấy số viewer chính xác, đồng thời đồng bộ `viewer_count` trong database theo presence count.

---

## Chi tiết thay đổi

### File 1: `supabase/functions/live-token/index.ts`

Thêm hàm hash UUID → số nguyên 32-bit duy nhất:

```typescript
function uuidToNumericUid(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & 0x7FFFFFFF; // ensure positive 31-bit int
  }
  return hash || 1; // avoid 0
}
```

Sử dụng `uuidToNumericUid(userId)` thay vì `userId` khi gọi Worker, và trả về UID số này cho client.

### File 2: `src/modules/live/pages/LiveHostPage.tsx`

- Import `useLivePresence` 
- Gọi `useLivePresence(effectiveSessionId)` để lấy `viewers`
- Hiển thị `viewers.length` thay vì `session.viewer_count` cho badge số mắt
- Đồng bộ `viewer_count` trong DB khi `viewers.length` thay đổi (debounced)

### File 3: `src/modules/live/pages/LiveAudiencePage.tsx`

- Import `useLivePresence`
- Hiển thị `viewers.length` thay vì `session.viewer_count` cho badge số mắt
- Giữ `increment/decrement` như fallback

---

## Các file cần thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/live-token/index.ts` | Thêm `uuidToNumericUid()`, dùng UID số duy nhất |
| `src/modules/live/pages/LiveHostPage.tsx` | Dùng `useLivePresence` cho viewer count chính xác |
| `src/modules/live/pages/LiveAudiencePage.tsx` | Dùng `useLivePresence` cho viewer count chính xác |

