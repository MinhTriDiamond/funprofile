

# Gộp lịch sử BTC thống nhất + Hiển thị giá trị USD

## Vấn đề hiện tại
- Tab Lịch sử khi chọn mạng Bitcoin hiển thị **2 phần riêng biệt**: BTC on-chain (từ Mempool) ở trên, donation BTC (từ database) ở dưới → gây nhầm lẫn, trùng lặp
- Giao dịch BTC on-chain không hiển thị giá trị USD tương đương

## Thay đổi

### `src/components/wallet/tabs/HistoryTab.tsx`

1. **Gộp 2 nguồn dữ liệu thành 1 danh sách thống nhất** khi `selectedNetwork === 'bitcoin'`:
   - Chuyển đổi `btcTxs` (on-chain) và `donations` (BTC filter) sang cùng 1 kiểu dữ liệu chung (UnifiedBtcTx)
   - Loại bỏ trùng lặp bằng cách so khớp `tx_hash` / `txid`
   - Sắp xếp toàn bộ theo thời gian giảm dần
   - Xóa section "Giao dịch BTC (on-chain)" riêng biệt (dòng 386-425)

2. **Hiển thị giá trị USD** cho mỗi giao dịch BTC on-chain:
   - Import `useTokenPrices` (đã có sẵn trong project) để lấy `prices?.BTC?.usd`
   - Trong mỗi row BTC on-chain, thêm dòng `≈ $X.XX` bên cạnh số BTC
   - Dùng formatNumber cho hiển thị nhất quán

3. **Tạo component `UnifiedBtcTxCard`** trong cùng file:
   - Giao dịch từ on-chain (chỉ có trên Mempool, không có trong donation DB): hiển thị badge Nhận/Gửi, số BTC, giá USD, thời gian, link mempool.space
   - Giao dịch từ donation DB (có thông tin user): hiển thị như `DonationCard` hiện tại (avatar, tên, message, receipt card)
   - Nếu trùng (cùng txid): ưu tiên hiển thị kiểu donation (có thông tin người gửi/nhận đầy đủ hơn), bổ sung giá USD

### Chi tiết kỹ thuật

- Kiểu dữ liệu thống nhất:
```
type UnifiedBtcEntry = {
  id: string;
  timestamp: number; // unix ms
  source: 'onchain' | 'donation';
  // onchain fields
  btcTx?: BtcTransaction;
  // donation fields  
  donation?: DonationRecord;
}
```

- Loại bỏ trùng: tạo Set các txid từ donations, chỉ thêm on-chain tx nếu txid chưa có trong Set
- Giá BTC: gọi `useTokenPrices()` 1 lần, dùng `prices?.BTC?.usd` để tính `amount * btcPrice`
- SummaryTable: khi bitcoin, bổ sung cột USD cho BTC summary

## Kết quả
- Khi chọn mạng Bitcoin: 1 danh sách duy nhất gộp cả on-chain lẫn donation, sắp xếp theo thời gian
- Mỗi giao dịch BTC hiển thị `≈ $X,XXX.XX` bên cạnh số BTC
- Không còn 2 section tách rời gây nhầm lẫn

