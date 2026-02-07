
# Kế Hoạch Xem & Xuất Lịch Sử Tặng Quà

## Tình Trạng Hiện Tại

| Tính Năng | Trạng Thái | Ghi Chú |
|-----------|-----------|---------|
| Lưu donation vào database | ✅ Đã có | Bảng `donations` với đầy đủ thông tin |
| UI xem lịch sử | ❌ Chưa có | Cần tạo mới |
| Xuất file Excel/CSV | ❌ Chưa có | Cần tạo mới |

**Lưu ý**: Dữ liệu donation đang được lưu thành công! Angel thấy 2 records gần đây trong database:
- 1,000 CAMLY gửi lúc 21:35
- 1,000 CAMLY gửi lúc 19:17

---

## Giải Pháp

### 1. Tạo Tab Lịch Sử Trong Wallet Page

Thêm tab "Lịch sử tặng quà" vào trang Wallet với 2 sections:
- **Đã gửi**: Danh sách những khoản bạn đã tặng
- **Đã nhận**: Danh sách những khoản bạn nhận được

### 2. Component DonationHistory

```
╔══════════════════════════════════════════════════════════════╗
║  📜 LỊCH SỬ TẶNG THƯỞNG                        [Xuất Excel]  ║
╠══════════════════════════════════════════════════════════════╣
║  [Đã gửi]  [Đã nhận]                                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 🎁 1.000 CAMLY → @MinhTri                              │  ║
║  │ "🌟 Tiếp tục phát huy nhé!"                            │  ║
║  │ 📅 07/02/2026 21:35:03  │  🔗 TX: 0x12d3...cd05        │  ║
║  │ ✨ +10 Light Score                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 🎁 1.000 CAMLY → @MinhTri                              │  ║
║  │ "🙏 Cảm ơn bạn rất nhiều!"                             │  ║
║  │ 📅 07/02/2026 19:17:00  │  🔗 TX: 0x1baa...c84d        │  ║
║  │ ✨ +10 Light Score                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ────────────────────────────────────────────────────────    ║
║  TỔNG KẾT: 2.000 CAMLY đã gửi | 0 CAMLY đã nhận              ║
╚══════════════════════════════════════════════════════════════╝
```

### 3. Tính Năng Xuất Excel/CSV

- Nút "Xuất Excel" sử dụng thư viện `xlsx` hoặc tự tạo CSV
- File xuất ra bao gồm:
  - Ngày giờ
  - Người gửi/nhận  
  - Số tiền + Token
  - Message
  - TX Hash
  - Light Score earned
  - Trạng thái

---

## Files Cần Tạo/Sửa

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/components/wallet/DonationHistoryTab.tsx` | **Tạo mới** - Component hiển thị lịch sử |
| 2 | `src/components/wallet/DonationHistoryItem.tsx` | **Tạo mới** - Item trong danh sách |
| 3 | `src/hooks/useDonationHistory.ts` | **Tạo mới** - Hook fetch data từ DB |
| 4 | `src/utils/exportDonations.ts` | **Tạo mới** - Utility xuất Excel/CSV |
| 5 | `src/components/wallet/WalletCenterContainer.tsx` | Thêm tab "Lịch sử" |

---

## Chi Tiết Kỹ Thuật

### Hook useDonationHistory

```typescript
interface DonationRecord {
  id: string;
  sender: { username: string; avatar_url: string | null };
  recipient: { username: string; avatar_url: string | null };
  amount: string;
  token_symbol: string;
  message: string | null;
  tx_hash: string;
  light_score_earned: number;
  created_at: string;
}

function useDonationHistory(type: 'sent' | 'received') {
  // Query donations table với join profiles
  // Filter by sender_id hoặc recipient_id
}
```

### Export to Excel (CSV Format)

Không cần thư viện ngoài, dùng native JavaScript:

```typescript
function exportToCSV(donations: DonationRecord[], filename: string) {
  const headers = ['Ngày', 'Người gửi', 'Người nhận', 'Số tiền', 'Token', 'Message', 'TX Hash', 'Light Score'];
  const rows = donations.map(d => [
    formatDate(d.created_at),
    d.sender.username,
    d.recipient.username,
    d.amount,
    d.token_symbol,
    d.message || '',
    d.tx_hash,
    d.light_score_earned
  ]);
  
  // Generate CSV and trigger download
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadBlob(csv, filename);
}
```

---

## Tích Hợp Vào Wallet Page

Trong WalletCenterContainer, thêm section mới bên dưới các card ví:

```typescript
<Tabs defaultValue="wallet">
  <TabsList>
    <TabsTrigger value="wallet">💳 Ví</TabsTrigger>
    <TabsTrigger value="history">📜 Lịch sử</TabsTrigger>
  </TabsList>
  
  <TabsContent value="wallet">
    {/* Nội dung ví hiện tại */}
  </TabsContent>
  
  <TabsContent value="history">
    <DonationHistoryTab />
  </TabsContent>
</Tabs>
```

---

## Timeline Ước Tính

| Task | Thời gian |
|------|-----------|
| Tạo useDonationHistory hook | 10 phút |
| Tạo DonationHistoryItem component | 15 phút |
| Tạo DonationHistoryTab với tabs sent/received | 15 phút |
| Tạo exportDonations utility | 10 phút |
| Tích hợp vào WalletCenterContainer | 10 phút |
| **Tổng** | **~60 phút** |

---

## Kết Quả Mong Đợi

1. User có thể xem đầy đủ lịch sử tặng quà trong Wallet page
2. Filter theo "Đã gửi" và "Đã nhận"
3. Xuất file Excel/CSV để lưu trữ hoặc báo cáo
4. Mỗi record hiển thị đầy đủ thông tin + link BSCScan

