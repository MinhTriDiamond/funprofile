

# Đổi logo BTC + Bổ sung hiển thị lịch sử giao dịch BTC

## Vấn đề
1. **Logo BTC hiện tại** là hình đồng xu vàng, cần đổi sang logo BTC chính thức (nền cam, chữ B trắng)
2. **Trang lịch sử giao dịch tổng** (`SystemDonationHistory`) chưa có option filter BTC trong dropdown token
3. **Trang lịch sử giao dịch tổng** hiển thị cứng "BSC" ở footer — cần hiển thị "Bitcoin" khi token_symbol là BTC
4. **Explorer URL** trong `SystemDonationHistory` dùng `getBscScanAddressUrl` / `getBscScanTxUrl` — cần route đúng sang mempool.space cho BTC

## Thay đổi

### 1) Thay file logo BTC
- Copy hình user upload vào `src/assets/tokens/btc-logo.png` (ghi đè file cũ)
- Logo mới: nền cam tròn, chữ B trắng (chuẩn Bitcoin)

### 2) `src/components/donations/SystemDonationHistory.tsx`

**a) Thêm BTC vào dropdown filter token** (dòng ~348-354):
```
<SelectItem value="BTC">BTC</SelectItem>
```

**b) Hiển thị chain name đúng** (dòng ~536):
- Thay `<span className="hidden sm:inline font-medium">BSC</span>` → logic kiểm tra `donation.token_symbol === 'BTC'` thì hiển thị "Bitcoin", còn lại "BSC"

**c) Explorer URL đúng cho BTC** (dòng ~471, 491, 539):
- Các chỗ dùng `getBscScanAddressUrl` và `getBscScanTxUrl` đã truyền `tokenSymbol` → helper hiện tại trong `bscScanHelpers.ts` đã hỗ trợ BTC (route sang mempool.space) → **đã đúng, không cần sửa**

### 3) `src/components/wallet/tabs/HistoryTab.tsx`

**DonationCard** (dòng ~225-226) đã check `isBtc = d.chain_id === 0 || d.token_symbol === 'BTC'` và route explorer URL đúng → **đã hỗ trợ BTC, không cần sửa**

### 4) `src/hooks/usePublicDonationHistory.ts`

Query donations từ Supabase không filter theo token_symbol cụ thể → **tự động bao gồm BTC donations** → không cần sửa

## Tóm tắt
| File | Thay đổi |
|------|----------|
| `src/assets/tokens/btc-logo.png` | Thay logo mới (cam, B trắng) |
| `SystemDonationHistory.tsx` dòng ~348 | Thêm `<SelectItem value="BTC">BTC</SelectItem>` |
| `SystemDonationHistory.tsx` dòng ~536 | Hiển thị "Bitcoin" thay vì "BSC" khi token là BTC |

## Kết quả
- Logo BTC mới hiển thị đồng nhất trên tất cả trang (Ví, Lịch sử, Feed, Card)
- Trang lịch sử giao dịch tổng hỗ trợ filter BTC
- Chain name hiển thị đúng "Bitcoin" cho giao dịch BTC

