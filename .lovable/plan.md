

## Mục tiêu
Thêm 2 mục mới vào Honor Board cá nhân: **Tổng nhận** và **Tổng tặng** (quy đổi USD), bấm vào mở dialog hiển thị chi tiết theo từng token (USDT, BTC, CAMLY, BNB, FUN…) — số lệnh + tổng số lượng cho mỗi loại.

## Thiết kế

### 1. Hai ô mới trên Honor Board (Desktop + Mobile)
- Vị trí: thêm 1 hàng nữa bên dưới hàng `Hôm nay / Tổng thưởng` trong `CoverHonorBoard` và `MobileStats`.
- 2 ô:
  - 🎁 **Tổng tặng** — hiển thị tổng USD đã tặng (ước tính theo `useTokenPrices`).
  - 💝 **Tổng nhận** — hiển thị tổng USD đã nhận.
- Style: tái dùng `StatRow` / `MobileTotalRow` y nguyên (bo tròn xanh viền vàng) — không phá layout.
- Bấm vào ô → mở dialog chi tiết.

### 2. Dialog chi tiết "Phân tích quà tặng"
- Component mới: `src/components/profile/GiftBreakdownDialog.tsx`.
- Props: `userId`, `direction: 'sent' | 'received'`, `open`, `onOpenChange`.
- Nội dung:
  - Header: avatar + tiêu đề "Tổng tặng" hoặc "Tổng nhận" + tổng USD lớn.
  - Danh sách card theo token, mỗi card 1 hàng:
    - Logo/icon token + ký hiệu (USDT, BTC, CAMLY, BNB, FUN…).
    - Số lệnh (`N lệnh`).
    - Tổng số lượng token (`123.45 CAMLY`).
    - Quy đổi USD (`≈ $12.34`).
  - Sắp xếp giảm dần theo USD value.
  - Trạng thái rỗng: "Chưa có giao dịch nào".
- Footer: nút "Xem lịch sử đầy đủ" → điều hướng `/wallet?tab=history&filter=sent|received`.

### 3. Hook dữ liệu
- Hook mới: `src/hooks/useGiftBreakdown.ts`.
- Truy vấn `donations` (chỉ `status='confirmed'`) gom nhóm theo `token_symbol`:
  - `sender_id = userId` → breakdown gửi.
  - `recipient_id = userId` → breakdown nhận.
- Trả về: `[{ token_symbol, count, total_amount, usd_value }]` + tổng USD.
- Quy đổi USD dùng `useTokenPrices` đã có (không thêm call edge).
- Cache 60s qua React Query, key `['gift-breakdown', userId, direction]`.

### 4. Đồng bộ với fix backfill đã được duyệt trước đó
- Số liệu lấy từ `donations` (đã đầy đủ 1006 dòng), không phụ thuộc bảng `transactions` nên không bị ảnh hưởng bởi vấn đề thiếu transactions.

## Tệp thay đổi
- **Tạo mới**:
  - `src/hooks/useGiftBreakdown.ts`
  - `src/components/profile/GiftBreakdownDialog.tsx`
- **Sửa**:
  - `src/components/profile/CoverHonorBoard.tsx` — thêm 2 ô + state mở dialog (cho cả `CoverHonorBoard` desktop và `MobileStats`).
  - `src/i18n/*` — thêm 2 key dịch `totalSent`, `totalReceived` (vi/en).

## Kiểm chứng sau khi triển khai
1. Mở `/angelaivan` → thấy 2 ô "Tổng nhận" / "Tổng tặng" hiển thị USD.
2. Bấm "Tổng tặng" → dialog liệt kê CAMLY/USDT/BTC… với số lệnh + tổng + USD.
3. Bấm "Tổng nhận" → tương tự cho phía nhận.
4. So khớp số liệu với trang `/wallet` → History.
5. Test trên mobile (bottom sheet `MobileStats`) → 2 ô và dialog hoạt động bình thường.

