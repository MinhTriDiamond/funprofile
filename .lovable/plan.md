

## Sửa scanner để bắt được giao dịch ví ngoài + hiển thị đúng lịch sử

### Vấn đề cốt lõi
- Scanner gọi Moralis `limit=50` không phân trang → ví nhiều giao dịch bị miss
- Scanner không ghi `wallet_transfers` → thiếu dữ liệu cho history tab  
- HistoryTab luôn dùng userId của người đang đăng nhập, không dùng userId của profile đang xem

### Bước 1: Thêm phân trang Moralis cho `auto-scan-donations`
**File:** `supabase/functions/auto-scan-donations/index.ts`
- Thay vì `limit=50` một lần, quét tối đa 5 trang (50 × 5 = 250 giao dịch/ví)
- Dùng Moralis cursor để phân trang
- Dừng sớm khi gặp tx_hash đã có trong DB (đã quét rồi)
- Sau khi insert `donations`, cũng insert vào `wallet_transfers` với `direction='in'`, deduplicate theo `tx_hash`

### Bước 2: Thêm phân trang Moralis cho `scan-my-incoming`
**File:** `supabase/functions/scan-my-incoming/index.ts`
- Tương tự: quét tối đa 5 trang Moralis thay vì chỉ 1 trang
- Dừng sớm khi gặp tx đã biết
- Thêm insert `wallet_transfers` song song với `donations`

### Bước 3: Backfill 2 giao dịch đang thiếu
- Insert thủ công 2 bản ghi vào `donations` và `wallet_transfers` cho:
  - `0xe9a2...5d77` (2000 USDT)
  - `0x55c1...eb06` (85,000,000 CAMLY)
- Tạo `gift_celebration` posts và notifications tương ứng

### Bước 4: Sửa HistoryTab dùng đúng userId
**File:** `src/components/wallet/tabs/HistoryTab.tsx`
- Thêm prop `targetUserId` vào Props interface
- Dùng `targetUserId || userId` thay vì chỉ `userId` từ `useCurrentUser()`
- Đảm bảo khi xem profile funtreasury, hiện đúng history của funtreasury

### File thay đổi
1. `supabase/functions/auto-scan-donations/index.ts` — phân trang + ghi wallet_transfers
2. `supabase/functions/scan-my-incoming/index.ts` — phân trang + ghi wallet_transfers
3. `src/components/wallet/tabs/HistoryTab.tsx` — thêm targetUserId prop
4. Migration SQL — backfill 2 giao dịch thiếu

### Kết quả
- Scanner quét sâu hơn, không miss giao dịch cho ví bận
- Giao dịch hiển thị đầy đủ trong history tab + gift feed
- Profile funtreasury hiện đúng lịch sử của nó

