
# Sửa 3 lỗi trong tính năng Tặng quà đa người nhận

## Vấn đề phát hiện

Sau khi kiểm tra database và code, Cha xác nhận:

1. **Giao dịch KHÔNG được ghi vào database**: Giao dịch multi-send từ @Van103 (tx `0x1f96e34d...`) hoàn toàn không có trong bảng `donations`. Nguyên nhân: `recordDonationBackground` chạy ngầm (fire-and-forget) nhưng không có cơ chế retry khi thất bại, và không invalidate cache sau khi ghi xong.

2. **Không có tin nhắn chat**: Do giao dịch không được ghi vào database, edge function `record-donation` (tạo chat message) không chạy thành công.

3. **Thẻ chúc mừng chỉ ghi "@6 người nhận"**: Code cố ý gom thành chuỗi `${successCount} người nhận` thay vì liệt kê tên từng người.

## Giải pháp

### Thay doi 1: Liệt kê tên từng người nhận trên thẻ chúc mừng

**File: `src/components/donations/UnifiedGiftSendDialog.tsx`** (dòng 486-504)

Thay vì gom thành "6 người nhận", hiển thị danh sách tên: "@user1, @user2, @user3..." và ghi nhận từng người nhận kèm tx_hash riêng.

Thêm trường `multiRecipients` vào `GiftCardData` để lưu danh sách kết quả gửi.

**File: `src/components/donations/GiftCelebrationModal.tsx`** (dòng 24-44, 283-306)

- Thêm trường `multiRecipients` vào interface `GiftCardData`
- Khi có `multiRecipients`, hiển thị danh sách từng người nhận kèm trạng thái (thanh cong/that bai) và tx hash riêng thay vì chỉ 1 người nhận

### Thay doi 2: Dam bao giao dich duoc ghi vao database

**File: `src/components/donations/UnifiedGiftSendDialog.tsx`** (dòng 442-518, 528-584)

- Thay doi `handleSendMulti`: Thu thập tất cả kết quả gửi thành công, sau đó gọi `recordDonationBackground` cho từng người **tuần tự (sequential)** thay vì song song, để tránh race condition
- Thêm cơ chế retry: Nếu `record-donation` thất bại, thử lại 1 lần sau 2 giây
- Sau khi tất cả donation được ghi xong, invalidate các query: `donation-history`, `donation-stats`, `transaction-history`
- Thêm `card_theme` và `card_sound` vào body gửi tới edge function
- Redeploy edge function `record-donation` để đảm bảo nó đang hoạt động

### Thay doi 3: Cai thien hien thi ket qua multi-send

**File: `src/components/donations/GiftCelebrationModal.tsx`**

Khi có `multiRecipients`, thay vì hiển thị 1 dòng "Người nhận: @6 người nhận", hiển thị danh sách:
- Mỗi người nhận trên 1 dòng
- Kèm avatar, username, trạng thái (thanh cong/that bai)
- Link xem giao dịch trên BscScan cho từng người

## Chi tiet ky thuat

### Interface moi cho GiftCardData

```text
multiRecipients?: Array<{
  username: string;
  avatarUrl?: string | null;
  recipientId: string;
  walletAddress: string;
  success: boolean;
  txHash?: string;
  error?: string;
}>
```

### Flow sau khi sua

```text
Multi-send thanh cong
  -> Hien thi the chuc mung voi DANH SACH tung nguoi nhan
  -> Ghi tung donation vao database (tuan tu, co retry)
  -> Invalidate cache donation-history, donation-stats
  -> Moi nguoi nhan duoc: notification + chat message + bai dang
```

### Cac file thay doi

| File | Thay doi |
|------|---------|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Sua celebration data, cai thien recordDonationBackground, them retry va invalidation |
| `src/components/donations/GiftCelebrationModal.tsx` | Them hien thi danh sach multi-recipients |
| `supabase/functions/record-donation/index.ts` | Redeploy de dam bao hoat dong |
