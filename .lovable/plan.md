
# Sửa lỗi hiển thị tên và đồng bộ ví trong mục Tặng quà

## Vấn đề 1: Hiển thị "Van103" (username) thay vì tên hiển thị (display_name)

**Nguyên nhân:** Trong `WalletCenterContainer.tsx`:
- Interface `Profile` (dòng 41-48) không có trường `display_name`
- Query `fetchProfile` (dòng 215) không select `display_name`
- Dòng 467 hiển thị `profile?.username` thay vì `profile?.display_name || profile?.username`

**Giải pháp:**
- Thêm `display_name: string | null` vào interface Profile
- Thêm `display_name` vào câu lệnh select
- Đổi hiển thị từ `profile?.username` sang `profile?.display_name || profile?.username`

## Vấn đề 2: Mục Tặng quà không cập nhật ví sau khi kết nối

**Nguyên nhân:** Trong `UnifiedGiftSendDialog.tsx`, sender profile chỉ được fetch 1 lần khi dialog mở (`isOpen` thay đổi). Khi người dùng kết nối ví ở trang Wallet rồi mở dialog Tặng quà, dialog vẫn dùng dữ liệu cũ (ví cũ hoặc null).

**Giải pháp:** Thêm dependency `address` (từ wagmi `useAccount`) vào useEffect fetch sender profile, để mỗi khi ví thay đổi và dialog đang mở, tự động refetch profile mới nhất từ database.

---

## Chi tiết kỹ thuật

### File 1: `src/components/wallet/WalletCenterContainer.tsx`

**Dòng 41-48** - Thêm `display_name` vào interface:
```typescript
interface Profile {
  username: string;
  display_name: string | null;  // THÊM MỚI
  avatar_url: string | null;
  cover_url: string | null;
  full_name: string | null;
  reward_status?: string;
  admin_notes?: string | null;
}
```

**Dòng 215** - Thêm `display_name` vào select:
```typescript
.select('username, display_name, avatar_url, cover_url, full_name, reward_status, admin_notes')
```

**Dòng 467** - Hiển thị display_name thay vì username:
```typescript
<p className="text-sm text-muted-foreground">{profile?.display_name || profile?.username || 'Account'}</p>
```

### File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`

**Dòng 131-144** - Thêm `address` vào dependency array để refetch khi ví thay đổi:
```typescript
useEffect(() => {
  if (!isOpen) return;
  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSenderUserId(session.user.id);
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, wallet_address, public_wallet_address')
      .eq('id', session.user.id)
      .single();
    if (data) setSenderProfile(data as any);
  })();
}, [isOpen, address]);  // Thêm address để refetch khi ví thay đổi
```

## Kết quả mong đợi
- Trang Ví hiển thị đúng tên hiển thị (display_name) thay vì username "Van103"
- Khi kết nối ví xong, mở dialog Tặng quà sẽ hiển thị đúng ví mới kết nối
