

## Vấn đề
1. **Sai dữ liệu lịch sử**: Bản ghi `donations.id=251bc6f5-...` ghi `amount=200000 BTC` (lẽ ra `0.000028 BTC` — tx hash `d59456b8...3b1f`). Một bản ghi khác `5b610dc7-...` ghi `4 BTC` (cũng nghi sai — cần xác minh on-chain). Tổng hợp BTC bị inflate từ ~0.617 BTC → 200008 BTC.
2. **Thiếu guard chống nhập sai**: Edge function `record-donation` không validate giới hạn hợp lý cho BTC (≥ 1 BTC ≈ ~2 tỷ VNĐ là cờ đỏ cần chặn).
3. **UI fallback yếu**: Khi `btcOnChain=null` (chế độ "Tất cả" toàn ví), `SummaryTable` lấy `summary.sent['BTC']` từ DB — nếu DB sai thì hiển thị sai. Cần luôn ưu tiên on-chain hoặc gắn cờ "dữ liệu nghi ngờ" cho amount > 1 BTC.

## Kế hoạch sửa

### Bước 1 — Sửa dữ liệu lịch sử (DB migration)
- Sửa `251bc6f5-8723-48c6-bcf9-84fd7041f0f4`: cập nhật `amount` từ `200000` → `0.000028` (đối chiếu lời nhắn + tx hash on-chain `d59456b8...3b1f`).
- Kiểm tra on-chain `5b610dc7-...` (tx `583e2881...e47d`) qua mempool API để xác định amount thực; nếu ≠ 4 thì sửa.
- Quét toàn bộ `donations WHERE token_symbol='BTC' AND amount::numeric > 1` (hiện 2 bản ghi) và đối chiếu on-chain.

### Bước 2 — Thêm validation BTC trong edge function `record-donation`
- Reject nếu `token_symbol='BTC'` và `amount > 1` (BTC) mà không có flag `force_admin_override` từ admin role.
- Log warning vào `audit_logs` cho các giao dịch BTC > 0.1.

### Bước 3 — Hardening UI (`HistoryTab.tsx`)
- Khi token là BTC: nếu `summary.sent['BTC'].amount > 100` (ngưỡng phi lý) **VÀ** không có `btcOnChain`, hiển thị badge cảnh báo "⚠️ Dữ liệu nghi ngờ" thay vì số liệu sai.
- Luôn cộng dồn cả `btcOnChain` (mempool) + DB donations cho row BTC, dedupe theo `tx_hash`, để bảng tổng hợp chính xác bất kể context.

### Bước 4 — Re-render ảnh chụp & xác nhận
- Sau migration, refetch `usePublicDonationHistory` → bảng tổng hợp BTC sẽ hiện ~0.6 BTC thay vì 200000.

## Files chỉnh
1. **Migration mới** — UPDATE 1-2 bản ghi sai amount BTC.
2. `supabase/functions/record-donation/index.ts` — thêm validation amount cap cho BTC.
3. `src/components/wallet/tabs/HistoryTab.tsx` — badge cảnh báo + ưu tiên on-chain cho BTC summary.

## Câu hỏi cần xác nhận
- Bản ghi `5b610dc7` (4 BTC, sender null, recipient = funtreasury) có thật là 4 BTC không? Con sẽ check on-chain trước khi sửa, nếu trùng on-chain thì giữ.
- Bản ghi `251bc6f5` con sẽ sửa thành `0.000028` theo lời nhắn — cha xác nhận?

