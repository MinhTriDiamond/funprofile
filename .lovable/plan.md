
# Kế Hoạch Thêm Click Xem Chi Tiết Lịch Sử Tặng Thưởng

## Tổng Quan

Khi click vào một item trong lịch sử tặng thưởng sẽ hiển thị popup chúc mừng:
- **Đã gửi (sender)** → Hiển thị bảng "Chúc Mừng Tặng Thưởng Thành Công" (theme vàng gold)
- **Đã nhận (receiver)** → Hiển thị bảng "Chúc Mừng Nhận Quà" (theme xanh lá)

---

## Thay Đổi Cần Làm

### 1. Cập nhật DonationHistoryItem

Thêm chức năng click và gọi callback khi user click vào item:

```
╔══════════════════════════════════════════════════════════════╗
║  🎁 1.000 CAMLY → @MinhTri                        ✨ +10     ║
║  "🌟 Tiếp tục phát huy nhé!"                                 ║
║  📅 21:35:03 7/2/2026  │  🔗 TX: 0x12d3...cd05               ║
╚══════════════════════════════════════════════════════════════╝
        ↓ Click vào item ↓
        
╔══════════════════════════════════════════════════════════════╗
║              ✨ 🎊 🎉 🎊 ✨                                   ║
║    🎁 CHÚC MỪNG TẶNG THƯỞNG THÀNH CÔNG!                      ║
║       (hoặc BẠN NHẬN ĐƯỢC QUÀ TẶNG!)                         ║
║                                                              ║
║           ⭐ 1.000 CAMLY ⭐                                   ║
║                   ...                                        ║
╚══════════════════════════════════════════════════════════════╝
```

### 2. Cập nhật DonationHistoryTab

Thêm state và handlers để quản lý popup:
- State: `selectedDonation` và `isDialogOpen`
- Render `DonationSuccessCard` hoặc `DonationReceivedCard` dựa trên tab đang active

### 3. Cập nhật DonationList

Truyền callback `onItemClick` xuống `DonationHistoryItem`

---

## Files Cần Sửa

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/components/wallet/DonationHistoryItem.tsx` | Thêm onClick prop và hover effect |
| 2 | `src/components/wallet/DonationHistoryTab.tsx` | Thêm state quản lý popup + render celebration cards |

---

## Chi Tiết Kỹ Thuật

### DonationHistoryItem.tsx

```typescript
interface DonationHistoryItemProps {
  donation: DonationRecord;
  type: 'sent' | 'received';
  onClick?: () => void; // Thêm mới
}

// Trong component
<div 
  className="bg-white rounded-xl border border-gray-100 p-4 
             hover:shadow-md transition-shadow cursor-pointer"
  onClick={onClick}
>
```

### DonationHistoryTab.tsx

```typescript
// Thêm state
const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

// Thêm handler
const handleDonationClick = (donation: DonationRecord) => {
  setSelectedDonation(donation);
  setIsCelebrationOpen(true);
};

// Render card phù hợp
{selectedDonation && activeTab === 'sent' && (
  <DonationSuccessCard
    isOpen={isCelebrationOpen}
    onClose={() => setIsCelebrationOpen(false)}
    data={{
      id: selectedDonation.id,
      amount: selectedDonation.amount,
      tokenSymbol: selectedDonation.token_symbol,
      senderUsername: selectedDonation.sender.username,
      senderAvatarUrl: selectedDonation.sender.avatar_url,
      recipientUsername: selectedDonation.recipient.username,
      recipientAvatarUrl: selectedDonation.recipient.avatar_url,
      message: selectedDonation.message,
      txHash: selectedDonation.tx_hash,
      lightScoreEarned: selectedDonation.light_score_earned || 0,
      createdAt: selectedDonation.created_at,
    }}
  />
)}

{selectedDonation && activeTab === 'received' && (
  <DonationReceivedCard
    isOpen={isCelebrationOpen}
    onClose={() => setIsCelebrationOpen(false)}
    data={{
      id: selectedDonation.id,
      amount: selectedDonation.amount,
      tokenSymbol: selectedDonation.token_symbol,
      senderUsername: selectedDonation.sender.username,
      senderAvatarUrl: selectedDonation.sender.avatar_url,
      senderId: selectedDonation.sender.id,
      message: selectedDonation.message,
      txHash: selectedDonation.tx_hash,
      createdAt: selectedDonation.created_at,
    }}
  />
)}
```

---

## UX Flow

```text
User vào Wallet → Tab "Lịch sử"
       ↓
Tab "Đã gửi" hoặc "Đã nhận"
       ↓
Click vào 1 donation item
       ↓
   ┌─────────────────┐     ┌─────────────────┐
   │  Tab "Đã gửi"   │     │  Tab "Đã nhận"  │
   │        ↓        │     │        ↓        │
   │ Success Card    │     │ Received Card   │
   │ (theme vàng)    │     │ (theme xanh)    │
   │ + âm thanh      │     │ + âm thanh      │
   │ + pháo hoa      │     │ + pháo hoa      │
   └─────────────────┘     └─────────────────┘
```

---

## Kết Quả Mong Đợi

1. User click vào item "Đã gửi" → Popup gold celebration với đầy đủ thông tin + âm thanh
2. User click vào item "Đã nhận" → Popup green celebration với nút "Gửi lời cảm ơn"
3. Đóng popup → Quay lại danh sách bình thường
4. Có hiệu ứng hover để user biết item có thể click

---

## Timeline Ước Tính

| Task | Thời gian |
|------|-----------|
| Cập nhật DonationHistoryItem với onClick | 5 phút |
| Cập nhật DonationHistoryTab với state và cards | 10 phút |
| Test | 5 phút |
| **Tổng** | **~20 phút** |
