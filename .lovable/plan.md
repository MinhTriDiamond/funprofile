

## Thêm nút "Xem Card" cạnh badge "Thành công" trong lịch sử giao dịch

### Mô tả
Thêm nút nhỏ "Xem Card" (hoặc icon biên nhận) cạnh badge trạng thái trong mỗi dòng giao dịch donation. Khi nhấp, hiện `DonationReceivedCard` dialog với thông tin biên nhận đầy đủ (như hình mẫu).

### Thay đổi

#### 1. `src/components/wallet/tabs/HistoryTab.tsx`
- Trong `DonationCard`, thêm state `showCard` và nút icon nhỏ cạnh `<StatusBadge>`
- Khi nhấp, mở `DonationReceivedCard` dialog với data được map từ `DonationRecord`
- Import `DonationReceivedCard` và `DonationReceivedData`

#### 2. `src/components/profile/WalletTransactionHistory.tsx`
- Tương tự: thêm nút "Xem Card" cạnh `<StatusBadge>` trong `DonationCard`
- Import và render `DonationReceivedCard` dialog

#### Chi tiết mapping data
```
DonationRecord → DonationReceivedData:
- id → id
- amount → amount
- token_symbol → tokenSymbol
- sender_username → senderUsername
- sender_display_name → senderDisplayName
- sender_avatar_url → senderAvatarUrl
- sender_id → senderId
- recipient_username → recipientUsername
- recipient_display_name → recipientDisplayName
- recipient_avatar_url → recipientAvatarUrl
- message → message
- tx_hash → txHash
- created_at → createdAt
- status → status
```

#### UI nút
- Nút nhỏ với icon `Receipt` hoặc `FileText` từ lucide-react
- Đặt cạnh badge "Thành công" trên cùng dòng
- Chỉ hiện cho giao dịch type `donation` (không hiện cho swap/transfer)

