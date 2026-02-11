

# Thêm Visibility Change Listener + Stream-to-R2 Migration UI

## Phần 1: Visibility Change Listener (Giữ phiên đăng nhập)

### File: `src/App.tsx`

Thêm một component `AuthSessionKeeper` bên trong `App` sử dụng `useEffect` để lắng nghe sự kiện `visibilitychange`. Khi user quay lại tab (từ hidden sang visible), tự động gọi `supabase.auth.refreshSession()` để đảm bảo token luôn mới.

Logic:
- Khi `document.visibilityState === 'visible'`: gọi `refreshSession()` (có timeout 10s)
- Nếu refresh thất bại: gọi `getSession()` để kiểm tra phiên còn hợp lệ không
- Nếu cả hai đều thất bại: log warning (không tự logout, để SDK tự xử lý)
- Chỉ refresh nếu tab đã ẩn >= 30 giây (tránh refresh liên tục khi alt-tab nhanh)

```typescript
// Component mới trong App.tsx
function AuthSessionKeeper() {
  useEffect(() => {
    let lastHiddenAt = 0;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && lastHiddenAt > 0) {
        const hiddenDuration = Date.now() - lastHiddenAt;
        // Chỉ refresh nếu tab ẩn >= 30 giây
        if (hiddenDuration >= 30000) {
          try {
            await Promise.race([
              supabase.auth.refreshSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
            ]);
          } catch (err) {
            console.warn('[AuthKeeper] Token refresh failed:', err);
          }
        }
      } else if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null;
}
```

Render `<AuthSessionKeeper />` ngay sau `<Sonner />` trong JSX.

## Phần 2: Stream-to-R2 Migration UI trong AdminMigration

### File: `src/pages/AdminMigration.tsx`

Thêm một Card mới "Migrate Stream to R2" vào trang AdminMigration (đặt trước card Orphan Videos). Card này sẽ:

**State mới:**
- `streamMigrating` (boolean)
- `streamDryRunning` (boolean) 
- `streamMigrationResult` (object chứa kết quả)

**Chức năng:**
1. **Nút "Preview (Dry Run)"**: Gọi edge function `migrate-stream-to-r2` với `{ dryRun: true }` để xem số lượng video cần migrate
2. **Nút "Migrate Batch"**: Gọi edge function với `{ batchSize: 5, deleteFromStream: false }` để migrate 5 video/lần
3. **Nút "Migrate & Delete from Stream"**: Gọi edge function với `{ batchSize: 5, deleteFromStream: true }`
4. Hiển thị kết quả: số video đã migrate, lỗi, video còn lại

**Giao diện:**
- Border màu cyan (border-cyan-500)
- Icon: Video + ArrowRight
- Hiển thị bảng kết quả với các cột: Post ID, UID, Status, Size
- Alert thông báo số video còn lại sau mỗi batch

**Hàm gọi edge function:**
```typescript
const runStreamToR2Migration = async (dryRun: boolean, deleteFromStream: boolean = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { toast.error('Phiên đăng nhập hết hạn'); return; }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-stream-to-r2`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dryRun, batchSize: 5, deleteFromStream }),
    }
  );
  // ... xử lý response
};
```

## Danh sách file thay đổi

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/App.tsx` | Sửa | Thêm `AuthSessionKeeper` component + import supabase |
| `src/pages/AdminMigration.tsx` | Sửa | Thêm Card "Migrate Stream to R2" với Preview/Migrate/Delete |

## Thứ tự thực hiện

1. Thêm `AuthSessionKeeper` vào `App.tsx`
2. Thêm Stream-to-R2 migration UI vào `AdminMigration.tsx`

