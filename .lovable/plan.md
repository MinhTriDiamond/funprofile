

# Sửa lỗi không hiển thị lịch sử swap — Moralis API hết quota

## Nguyên nhân

Đã chạy `backfill-swap-transactions` cho user `thuongnguyen_camly` nhưng Moralis API trả về lỗi **401**:
> "Your plan: free-plan-daily total included usage has been consumed"

Moralis free plan đã hết quota hàng ngày → không lấy được ERC20 transfers → không phát hiện được swap nào.

## Giải pháp: Thêm BSCScan API làm fallback

Thay vì chỉ phụ thuộc Moralis, thêm BSCScan API (`api.bscscan.com`) làm nguồn dữ liệu thay thế. BSCScan free tier cho phép 5 requests/giây, đủ cho backfill.

### Thay đổi

**File: `supabase/functions/backfill-swap-transactions/index.ts`**
- Thêm hàm `fetchFromBscScan()` gọi BSCScan API endpoint `tokentx` để lấy ERC20 transfers
- Logic: Thử Moralis trước → nếu lỗi (401/403/429) → fallback sang BSCScan
- BSCScan trả format khác (camelCase) → cần map lại sang format `TokenTransfer` hiện tại
- Cần thêm secret `BSCSCAN_API_KEY`

**File: `supabase/functions/fetch-wallet-history/index.ts`**
- Tương tự thêm BSCScan fallback cho lịch sử ví chung, tránh bị gián đoạn khi Moralis hết quota

### Sau khi deploy
- Chạy lại backfill cho user `thuongnguyen_camly` để lấy swap history
- Swap BTC→USDT nếu thực hiện trên DEX (PancakeSwap) sẽ hiển thị dưới dạng BTCB→USDT
- **Lưu ý**: Nếu swap thực hiện trên sàn CEX (Binance, OKX...) thì không có dữ liệu on-chain → không thể backfill tự động

### Yêu cầu
- Cần BSCScan API key (đăng ký miễn phí tại bscscan.com) → sẽ yêu cầu nhập qua `add_secret`

