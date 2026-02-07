
# Kế Hoạch Sửa Lỗi "Người Nhận Chưa Thiết Lập Ví" Khi Tặng Từ Navbar

## Nguyên Nhân Lỗi

| Luồng | Query | Có `wallet_address`? | Kết quả |
|-------|-------|---------------------|---------|
| GiftNavButton (Navbar) | `id, username, avatar_url, full_name` | KHÔNG | Báo "chưa có ví" |
| DonationButton (Post) | Nhận từ parent component | | Hoạt động bình thường |

**Vấn đề cốt lõi:** `GiftNavButton` không lấy `wallet_address` khi query bảng `profiles`, nên khi mở `DonationDialog`, prop `recipientWalletAddress` là `undefined` dù user thực tế có ví.

---

## Giải Pháp

### 1. Cập nhật Interface `FriendProfile`

Thêm field `wallet_address` vào interface:

```typescript
interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  wallet_address: string | null; // Thêm mới
}
```

### 2. Cập nhật Query trong useQuery

Thêm `wallet_address` vào câu select:

```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, username, avatar_url, full_name, wallet_address') // Thêm wallet_address
  .in('id', friendIds);
```

### 3. Cập nhật DonationDialog Props

Truyền `recipientWalletAddress` khi render `DonationDialog`:

```typescript
<DonationDialog
  isOpen={isDonationDialogOpen}
  onClose={handleDonationClose}
  recipientId={selectedRecipient.id}
  recipientUsername={selectedRecipient.username}
  recipientAvatarUrl={selectedRecipient.avatar_url || undefined}
  recipientWalletAddress={selectedRecipient.wallet_address} // Thêm mới
/>
```

---

## File Cần Sửa

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/components/donations/GiftNavButton.tsx` | Thêm `wallet_address` vào interface, query và props |

---

## Chi Tiết Thay Đổi

### GiftNavButton.tsx

**Interface (Line 18-23):**
```typescript
// Trước
interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

// Sau
interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  wallet_address: string | null;
}
```

**Query (Line 60-63):**
```typescript
// Trước
.select('id, username, avatar_url, full_name')

// Sau
.select('id, username, avatar_url, full_name, wallet_address')
```

**DonationDialog Desktop (Line 188-194):**
```typescript
// Trước
<DonationDialog
  recipientId={selectedRecipient.id}
  recipientUsername={selectedRecipient.username}
  recipientAvatarUrl={selectedRecipient.avatar_url || undefined}
/>

// Sau
<DonationDialog
  recipientId={selectedRecipient.id}
  recipientUsername={selectedRecipient.username}
  recipientAvatarUrl={selectedRecipient.avatar_url || undefined}
  recipientWalletAddress={selectedRecipient.wallet_address}
/>
```

**DonationDialog Mobile (Line 285-290):**
Tương tự thêm `recipientWalletAddress={selectedRecipient.wallet_address}`

---

## Kết Quả Mong Đợi

1. Khi click Gift từ Navbar và chọn "Minh Trí (Wallet 65c5)"
2. `DonationDialog` sẽ nhận được `recipientWalletAddress = "0xe3e97a95d3f61814473f6d1eebba8253286d65c5"`
3. Không còn hiện cảnh báo "Người nhận chưa thiết lập ví"
4. Hiển thị form donation đầy đủ giống như khi click từ bài viết

---

## Timeline

| Task | Thời gian |
|------|-----------|
| Cập nhật interface | 1 phút |
| Cập nhật query | 1 phút |
| Cập nhật 2 chỗ render DonationDialog | 2 phút |
| Test | 3 phút |
| **Tổng** | **~7 phút** |
