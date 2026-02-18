
# Kế hoạch: Hiển thị đầy đủ thông tin tặng quà + Tên hiển thị trong lịch sử

## Tổng quan vấn đề

Có 3 vấn đề cần sửa:

1. **Trang chủ (Feed) không hiển thị hình ảnh tặng tiền**: `GiftCelebrationCard` không có trường `display_name` trong interface `profiles` — chỉ có `username`. Kết quả là tên hiển thị không dùng `display_name`.

2. **Lịch sử giao dịch hiển thị `username` thay vì `display_name`**: Hook `useDonationHistory` chỉ lấy `username` từ bảng `profiles`, không lấy `display_name`. Component `DonationHistoryItem` cũng chỉ hiển thị `@username`.

3. **Cần đảm bảo luồng tặng hàng loạt ghi nhận đầy đủ**: Khi `invalidateDonationCache()` được gọi sau khi tặng hàng loạt, Feed và lịch sử giao dịch phải tự cập nhật. Cơ chế này đã có, nhưng cần kiểm tra và đảm bảo đồng bộ.

---

## Các thay đổi cụ thể

### 1. `src/hooks/useDonationHistory.ts` — Thêm `display_name`

Cập nhật query để lấy thêm `display_name` từ bảng `profiles`:

```
sender:profiles!donations_sender_id_fkey(id, username, display_name, avatar_url, ...)
recipient:profiles!donations_recipient_id_fkey(id, username, display_name, avatar_url, ...)
```

Cập nhật interface `DonationRecord`:
```ts
export interface DonationRecord {
  sender: { id: string; username: string; display_name?: string | null; avatar_url: ... };
  recipient: { id: string; username: string; display_name?: string | null; avatar_url: ... };
  ...
}
```

### 2. `src/components/wallet/DonationHistoryItem.tsx` — Hiển thị `display_name`

Thay đổi logic hiển thị tên: ưu tiên `display_name` hơn `username`:

- Dòng tên chính (bold): dùng `otherUser?.display_name || otherUser?.username`
- Dòng phụ: hiển thị `@username` (như subtext)

Kết quả: User "Angel Ái Vân" (display_name) sẽ hiển thị thay vì "van103" (username).

### 3. `src/components/wallet/DonationHistoryTab.tsx` — Truyền `display_name` vào modal

Khi mở `GiftCelebrationModal` hoặc `DonationReceivedCard` từ lịch sử, truyền `display_name` thay vì `username`:
```ts
senderUsername: selectedDonation.sender?.display_name || selectedDonation.sender?.username || 'Unknown'
recipientUsername: selectedDonation.recipient?.display_name || selectedDonation.recipient?.username || 'Unknown'
```

### 4. `src/components/feed/GiftCelebrationCard.tsx` — Cập nhật interface + hiển thị `display_name`

**Interface**: Thêm `display_name` vào `profiles`:
```ts
profiles: {
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
};
```

**Fetch profiles**: Cập nhật query `public_profiles` để lấy thêm `display_name` (view này đã có trường `display_name` theo schema).

**Hiển thị**: Thay `@{senderUsername}` → ưu tiên `display_name` trong phần nội dung chính, giữ `@username` ở dưới avatar.

### 5. `src/components/feed/GiftCelebrationCard.tsx` — Đảm bảo hiển thị đúng trên Feed

Hiện tại card đã được render trên Feed khi `post_type === 'gift_celebration'`. Vấn đề là `public_profiles` view không bao gồm `display_name` trong query fetch. Sửa query để thêm `display_name`.

State mới:
```ts
const [recipientProfile, setRecipientProfile] = useState<{ 
  username: string; 
  display_name?: string | null; 
  avatar_url: string | null 
} | null>(null);
```

### 6. `src/hooks/useFeedPosts.ts` — Đảm bảo `display_name` được lấy cho Gift posts

Query hiện tại đã lấy `display_name` trong `fetchFeedPage` và `fetchHighlightedPosts`. Tuy nhiên, interface `FeedPost.profiles` chưa có `display_name`. Cần bổ sung để TypeScript nhận đúng.

---

## Tóm tắt file thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useDonationHistory.ts` | Thêm `display_name` vào query + interface |
| `src/components/wallet/DonationHistoryItem.tsx` | Hiển thị `display_name` thay vì `username`, giữ `@username` làm subtext |
| `src/components/wallet/DonationHistoryTab.tsx` | Truyền `display_name` vào celebration modals |
| `src/components/feed/GiftCelebrationCard.tsx` | Thêm `display_name` vào interface + fetch + hiển thị |
| `src/hooks/useFeedPosts.ts` | Thêm `display_name` vào `FeedPost.profiles` interface |

---

## Ghi chú kỹ thuật

- `public_profiles` view đã có cột `display_name` → không cần migration database.
- Luồng tặng hàng loạt (`UnifiedGiftSendDialog`) đã gọi `invalidateDonationCache()` sau khi hoàn thành, phát sự kiện `invalidate-feed` và `invalidate-donations` — Feed và lịch sử sẽ tự reload.
- Không cần thay đổi Edge Function `record-donation`.
