
## Thêm Realtime Subscription vào useMintHistory

### Mục tiêu
Khi Admin ký duyệt một mint request (status thay đổi từ `pending_sig` → `signed` → `submitted` → `confirmed`), giao diện của user tự động cập nhật mà không cần refresh trang.

### Cơ chế hoạt động

Supabase Realtime có thể lắng nghe thay đổi trên bảng `pplp_mint_requests` với filter theo `user_id`. Mỗi khi Admin cập nhật status trong Admin Panel, Supabase sẽ push event tới client qua WebSocket, `useMintHistory` sẽ nhận event và cập nhật state ngay lập tức.

Cần kiểm tra bảng `pplp_mint_requests` đã có trong `supabase_realtime` publication chưa — nếu chưa cần thêm vào migration.

### Các thay đổi cần thực hiện

**1. Database Migration — Enable Realtime cho `pplp_mint_requests`**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.pplp_mint_requests;
```

**2. Cập nhật `src/hooks/useMintHistory.ts`**

Thêm Supabase Realtime subscription với filter theo `user_id`:

```typescript
useEffect(() => {
  let userId: string | null = null;

  const setupSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userId = user.id;

    // Fetch initial data
    await fetchHistory();

    // Subscribe to realtime changes for THIS user's mint requests
    const channel = supabase
      .channel(`mint-history-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pplp_mint_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useMintHistory] Realtime update:', payload);
          // Khi có thay đổi bất kỳ → re-fetch để đảm bảo data đồng bộ
          fetchHistory();
        }
      )
      .subscribe();

    return channel;
  };

  let channelRef: ReturnType<typeof supabase.channel> | null = null;

  setupSubscription().then(channel => {
    if (channel) channelRef = channel;
  });

  // Cleanup khi component unmount
  return () => {
    if (channelRef) {
      supabase.removeChannel(channelRef);
    }
  };
}, [fetchHistory]);
```

**Tối ưu hóa — Update state trực tiếp thay vì re-fetch:**

Thay vì gọi `fetchHistory()` mỗi lần có event (tạo thêm network request), có thể cập nhật state trực tiếp từ payload:

```typescript
(payload) => {
  if (payload.eventType === 'UPDATE') {
    // Cập nhật chỉ row bị thay đổi, không cần re-fetch toàn bộ
    setAllRequests(prev => prev.map(r =>
      r.id === payload.new.id ? { ...r, ...payload.new } : r
    ));
  } else if (payload.eventType === 'INSERT') {
    // Thêm request mới vào đầu danh sách
    setAllRequests(prev => [payload.new as MintRequest, ...prev]);
  }
}
```

Cách này hiệu quả hơn vì không tạo network request mới mỗi khi có update.

**3. Thêm visual feedback khi nhận realtime update**

Thêm state `lastUpdated` để hiển thị dấu hiệu trực quan khi có cập nhật tự động:

```typescript
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
```

Trong `MintRequestRow`, khi status vừa thay đổi (trong vòng 5 giây), hiển thị flash animation nhẹ để user biết có cập nhật mới.

**4. Thêm `usePendingActions` realtime (bonus)**

`usePendingActions` cũng nên subscribe vào `light_actions` để khi `mint_status` thay đổi (ví dụ: `approved` → `pending_sig` sau khi mint), UI cập nhật ngay không cần manual refetch.

Tuy nhiên, `light_actions` có RLS filter theo `user_id` và cần enable realtime riêng — sẽ thêm vào cùng migration.

### Tổng hợp thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/` | Enable realtime cho `pplp_mint_requests` và `light_actions` |
| `src/hooks/useMintHistory.ts` | Thêm realtime subscription, cleanup on unmount, optimistic state update |
| `src/hooks/usePendingActions.ts` | Thêm realtime subscription cho `light_actions` (bonus) |

### Kết quả sau khi triển khai

```text
Admin Panel: Admin bấm "Ký" mint request
  ↓
Database UPDATE pplp_mint_requests SET status='signed'
  ↓
Supabase Realtime push event tới user's browser (WebSocket)
  ↓
useMintHistory nhận payload → cập nhật state ngay lập tức
  ↓
UI tự động đổi badge từ "Chờ Admin ký" → "Đã ký, chờ Submit"
  ↓
(không cần refresh, không có loading)

Admin Submit → Confirmed:
  ↓
status = 'submitted' → UI hiện "Đã gửi blockchain"
  ↓
status = 'confirmed' → UI hiện "Đã xác nhận ✓" (chuyển sang Lịch sử)
```
