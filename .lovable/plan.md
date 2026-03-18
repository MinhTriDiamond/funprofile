

## Plan: Thêm tracking giao dịch chuyển ví (Deposit/Withdraw) vào lịch sử

### Vấn đề
Hiện tại chỉ track **donations** (tặng/nhận) và **swaps**. Các giao dịch **chuyển token trực tiếp** từ ví ngoài vào FUN.RICH wallet (deposit) hoặc từ FUN.RICH ra ví ngoài (withdraw) chưa được ghi nhận → bảng tổng kết thiếu dữ liệu.

### Giải pháp

**1. Tạo bảng `wallet_transfers`** (migration)
- `id`, `user_id`, `tx_hash` (unique), `direction` ('in'/'out'), `token_symbol`, `token_address`, `amount`, `counterparty_address`, `chain_id`, `status`, `created_at`
- RLS: public SELECT, authenticated INSERT cho chính mình
- Index trên `user_id`, `tx_hash`

**2. Tạo Edge Function `backfill-wallet-transfers`**
- Dùng Moralis API lấy tất cả ERC20 transfers của wallet
- Lọc bỏ các tx_hash đã có trong `donations` hoặc `swap_transactions` (tránh trùng)
- Phân loại: nếu `from = wallet` → direction 'out'; nếu `to = wallet` → direction 'in'
- Chỉ ghi các token đã biết (USDT, CAMLY, BTCB, FUN, WBNB)
- Insert vào `wallet_transfers`

**3. Cập nhật RPC `get_user_donation_summary`**
- Thêm 2 CTE: `transfer_in` (direction='in' → received) và `transfer_out` (direction='out' → sent)
- Gộp vào `all_received` và `all_sent` cùng donations + swaps

**4. Cập nhật Hook `usePublicDonationHistory.ts`**
- Fetch thêm `wallet_transfers` table
- Map thành `DonationRecord` với `type: 'transfer'`
- Merge vào danh sách chung, sort theo `created_at`

**5. Cập nhật UI `WalletTransactionHistory.tsx`**
- Thêm `TransferCard` component (badge màu xanh dương "Chuyển vào" / cam "Chuyển ra")
- Hiển thị counterparty address (rút gọn) + link BscScan
- Thêm filter tab "Chuyển"
- Cập nhật type trong `DonationFilter`

### Files cần tạo/sửa
- **Tạo**: Migration SQL (bảng `wallet_transfers` + cập nhật RPC)
- **Tạo**: `supabase/functions/backfill-wallet-transfers/index.ts`
- **Sửa**: `src/hooks/usePublicDonationHistory.ts` — fetch + merge transfers
- **Sửa**: `src/components/profile/WalletTransactionHistory.tsx` — TransferCard + filter

