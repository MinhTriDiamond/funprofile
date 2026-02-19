
## Hiển thị avatar người nhận trong card chúc mừng nhận quà (/wallet/history)

### Phân tích
- Card chúc mừng nhận quà trong `/wallet/history` và `/donations` sử dụng **cùng một component** `DonationReceivedCard`
- Component này hỗ trợ sẵn các props: `recipientUsername`, `recipientDisplayName`, `recipientAvatarUrl`
- Tuy nhiên, cả 2 nơi đều **chưa truyền** các props này, nên card luôn hiển thị "Bạn" / "@you" với avatar chữ cái

### Giải pháp
Truyền thêm thông tin người nhận (username, display_name, avatar_url) vào `DonationReceivedCard` ở cả 2 file:

| File | Thay doi |
|------|----------|
| `src/components/wallet/DonationHistoryTab.tsx` (dòng 305-315) | Thêm `recipientUsername`, `recipientDisplayName`, `recipientAvatarUrl` từ `selectedDonation.recipient` |
| `src/components/donations/SystemDonationHistory.tsx` (dòng 699-709) | Thêm tương tự |

### Chi tiết thay đổi

Thêm 3 dòng vào data prop của `DonationReceivedCard` ở cả 2 file:

```text
recipientUsername: selectedDonation.recipient?.username,
recipientDisplayName: selectedDonation.recipient?.display_name,
recipientAvatarUrl: selectedDonation.recipient?.avatar_url,
```

Kết quả: Card chúc mừng sẽ hiển thị đúng avatar và tên người nhận thay vì chỉ hiện "Bạn" với chữ cái đầu.
