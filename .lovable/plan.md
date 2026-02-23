
# Quy Tắc Một Host Duy Nhất (Single Active Host Rule)

## Vấn Đề Hiện Tại
Hiện tại hệ thống **không giới hạn** số phiên live cùng lúc cho mỗi tài khoản. Database cho thấy có tài khoản đang có tới 5 phiên live "active" cùng lúc -- rõ ràng là lỗi ghost session.

## Giải Pháp: Kiểu Facebook
Khi người dùng bắt đầu live mới, hệ thống sẽ **tự động kết thúc** tất cả phiên live cũ của người đó (không chặn, mà thay thế). Thiết bị cũ nhận sự kiện realtime để tự động rời phiên.

---

## Bước 1: Database Migration

### 1a. Unique Partial Index
Đảm bảo chỉ 1 phiên live "active" tồn tại cho mỗi user:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS one_active_live_per_user
ON public.live_sessions(host_user_id)
WHERE status = 'live';
```

### 1b. Dọn dẹp ghost sessions hiện tại
Trước khi thêm index, kết thúc tất cả phiên live "ma" (giữ lại phiên mới nhất cho mỗi user):
```sql
UPDATE public.live_sessions
SET status = 'ended', ended_at = now(), updated_at = now()
WHERE status = 'live'
  AND id NOT IN (
    SELECT DISTINCT ON (host_user_id) id
    FROM live_sessions
    WHERE status = 'live'
    ORDER BY host_user_id, started_at DESC
  );
```

### 1c. Thêm cột device_id (tùy chọn, để tracking)
```sql
ALTER TABLE public.live_sessions
ADD COLUMN IF NOT EXISTS device_id text;
```

---

## Bước 2: Sửa Logic Tạo Phiên Live

### File: `src/modules/live/liveService.ts` (hàm `createLiveSession`)

Trước khi insert phiên mới, **tự động kết thúc** tất cả phiên live cũ của user:

```typescript
// Trong createLiveSession, sau khi có userId:

// Auto-end any existing live sessions (Facebook-style)
await db
  .from('live_sessions')
  .update({
    status: 'ended',
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('host_user_id', userId)
  .eq('status', 'live');
```

Ngoài ra, cập nhật metadata post của các phiên cũ sang `live_status: 'ended'`.

---

## Bước 3: Listener Realtime - Tự Động Rời Phiên Cũ

### File: `src/modules/live/pages/LiveHostPage.tsx`

Thêm useEffect lắng nghe thay đổi realtime trên `live_sessions`. Nếu phiên hiện tại bị chuyển sang `ended` (bởi thiết bị khác bắt đầu live mới):

```typescript
useEffect(() => {
  if (!effectiveSessionId) return;
  
  const channel = supabase
    .channel(`live-force-stop-${effectiveSessionId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'live_sessions',
      filter: `id=eq.${effectiveSessionId}`,
    }, (payload) => {
      if (payload.new.status === 'ended') {
        // Session was force-ended by another device
        toast.info('Phiên live đã kết thúc vì bạn bắt đầu live từ thiết bị khác.');
        leave();
        navigate('/');
      }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [effectiveSessionId]);
```

---

## Bước 4: Heartbeat - Dọn Ghost Sessions

### File mới: `src/modules/live/hooks/useLiveHeartbeat.ts`

Client gửi heartbeat mỗi 15 giây (update `updated_at`):

```typescript
// Mỗi 15 giây, update updated_at cho phiên live
useEffect(() => {
  if (!sessionId || !isHost) return;
  const interval = setInterval(async () => {
    await supabase
      .from('live_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('status', 'live');
  }, 15000);
  return () => clearInterval(interval);
}, [sessionId, isHost]);
```

### Database: Scheduled cleanup (cron hoặc edge function)
Phiên live không có heartbeat > 60 giây sẽ tự động kết thúc. Có thể thêm sau bằng pg_cron hoặc edge function chạy định kỳ.

---

## Bước 5: Token Validation (đã có sẵn)

Hệ thống `live-token` edge function **đã kiểm tra** session phải ở trạng thái `live` hoặc `starting`. Nếu phiên cũ bị kết thúc, token mới sẽ không được cấp cho phiên đó --> bảo mật đã đảm bảo.

---

## Tóm Tắt Các File Thay Đổi

| File | Hành động |
|------|-----------|
| Database migration | Dọn ghost sessions + Unique index + cột device_id |
| `src/modules/live/liveService.ts` | Auto-end phiên cũ trước khi tạo mới |
| `src/modules/live/pages/LiveHostPage.tsx` | Listener realtime force-stop |
| `src/modules/live/hooks/useLiveHeartbeat.ts` | Hook heartbeat mới |

## Kịch Bản Hoạt Động

- **Kịch bản 1**: User live trên PC, mở live trên điện thoại --> PC tự động nhận realtime event, hiện thông báo và thoát. Điện thoại trở thành host.
- **Kịch bản 2**: User mở 2 tab --> Tab thứ 2 tạo phiên mới, tab 1 tự động kết thúc.
- **Kịch bản 3**: Mất mạng --> Heartbeat ngừng, phiên tự kết thúc sau timeout.
