

# Kế Hoạch: Thêm Tab Lịch Sử Giao Dịch Toàn Hệ Thống vào Admin Dashboard

## Tổng Quan

Tạo tính năng cho Admin xem lịch sử tặng thưởng (donations) của tất cả users trong hệ thống, với đầy đủ chức năng lọc, tìm kiếm, phân trang và xuất CSV.

## So Sánh User vs Admin

| Tính năng | User (hiện tại) | Admin (mới) |
|-----------|-----------------|-------------|
| Phạm vi | Chỉ của cá nhân | Toàn hệ thống |
| Lọc theo user | Không | Có |
| Lọc theo token | Không | Có |
| Lọc theo trạng thái | Không | Có |
| Lọc theo ngày | Không | Có |
| Xem chi tiết | Click xem celebration | Click xem dialog chi tiết |
| Xuất CSV | Có | Có (toàn bộ) |

## Các File Cần Tạo/Sửa

### 1. Tạo Hook mới: `src/hooks/useAdminDonationHistory.ts`

Hook để fetch lịch sử donations của tất cả users với:
- Phân trang (limit/offset)
- Lọc theo sender_id, recipient_id
- Lọc theo token_symbol
- Lọc theo status (pending/confirmed/failed)
- Lọc theo khoảng thời gian
- Thống kê tổng hợp toàn hệ thống

### 2. Tạo Component: `src/components/admin/DonationHistoryAdminTab.tsx`

Tab mới trong Admin Dashboard với:
- **Cards thống kê tổng quan**: Tổng số giao dịch, tổng giá trị theo token, Light Score tổng
- **Bộ lọc**: Search username, dropdown token, dropdown status, date range
- **Table hiển thị**: Sender, Recipient, Amount, Token, Message, TX Hash, Light Score, Status, Time
- **Pagination**: Phân trang 50 records/page
- **Export CSV**: Xuất file với tất cả dữ liệu đã lọc

### 3. Sửa: `src/pages/Admin.tsx`

Thêm tab mới "Donations" vào TabsList:
- Icon: Gift
- Label: "🎁 Donations"
- Value: "donations"

## Chi Tiết Kỹ Thuật

### Hook `useAdminDonationHistory.ts`

```typescript
interface AdminDonationFilters {
  searchTerm?: string;
  tokenSymbol?: string;
  status?: 'all' | 'pending' | 'confirmed' | 'failed';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Query donations với filters
const query = supabase
  .from('donations')
  .select(`
    id, amount, token_symbol, message, tx_hash,
    light_score_earned, created_at, status,
    sender:profiles!donations_sender_id_fkey(id, username, avatar_url),
    recipient:profiles!donations_recipient_id_fkey(id, username, avatar_url)
  `, { count: 'exact' })
  .order('created_at', { ascending: false });

// Stats tổng hợp
const statsQuery = supabase
  .from('donations')
  .select('amount, token_symbol, light_score_earned')
  .eq('status', 'confirmed');
```

### Component `DonationHistoryAdminTab.tsx`

**Cấu trúc:**
```
┌──────────────────────────────────────────────────┐
│ 🎁 Lịch Sử Tặng Thưởng Toàn Hệ Thống             │
├──────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Tổng GD │ │ CAMLY   │ │ BNB     │ │ Light   │ │
│ │   4     │ │ 4,413   │ │ 0       │ │ Score   │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├──────────────────────────────────────────────────┤
│ [Search...] [Token ▼] [Status ▼] [Từ] [Đến] [🔄]│
├──────────────────────────────────────────────────┤
│ | Người gửi | Người nhận | Số tiền | Token | ...│
│ |-----------|------------|---------|-------|----│
│ | @thuy     | @hanh      | 413     | CAMLY | ...│
│ | @huyen    | @vinh      | 2,000   | CAMLY | ...│
│ | ...       | ...        | ...     | ...   | ...│
├──────────────────────────────────────────────────┤
│ Trang 1/1    [<] [1] [>]             [Xuất CSV] │
└──────────────────────────────────────────────────┘
```

**Features:**
- Sortable columns (click header để sort)
- Clickable row → Mở dialog chi tiết
- Copy TX hash với 1 click
- Link đến profile của sender/recipient
- Badge màu theo status

### Sửa `Admin.tsx`

Thêm import và tab mới:
```tsx
import { DonationHistoryAdminTab } from "@/components/admin/DonationHistoryAdminTab";

// Trong TabsList, thêm sau "Financial":
<TabsTrigger value="donations" className="gap-2 py-3">
  <Gift className="w-4 h-4" />
  <span className="hidden sm:inline">🎁 Donations</span>
</TabsTrigger>

// Thêm TabsContent:
<TabsContent value="donations">
  <DonationHistoryAdminTab />
</TabsContent>
```

## Tổng Kết Files

| File | Hành động |
|------|-----------|
| `src/hooks/useAdminDonationHistory.ts` | Tạo mới |
| `src/components/admin/DonationHistoryAdminTab.tsx` | Tạo mới |
| `src/pages/Admin.tsx` | Sửa - thêm tab |
| `src/utils/exportDonations.ts` | Sửa - thêm export all |

## Kết Quả Mong Đợi

- Admin có thể xem TOÀN BỘ lịch sử tặng thưởng của hệ thống
- Lọc và tìm kiếm nhanh theo nhiều tiêu chí
- Thống kê tổng hợp ở đầu trang
- Xuất CSV để báo cáo/phân tích
- Giao diện nhất quán với các tab admin khác

