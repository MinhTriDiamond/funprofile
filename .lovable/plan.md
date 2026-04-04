

# Sửa lỗi số dư BTC thực tế và thống kê hệ thống không khớp

## Nguyên nhân gốc

Hệ thống hiện có **2 nguồn dữ liệu BTC khác nhau** mà không đồng bộ:

1. **Thẻ Tài sản (AssetTab)** — lấy trực tiếp từ Mempool.space API → hiển thị **tất cả giao dịch on-chain** (kể cả trước khi đăng ký Fun Play)
2. **Bảng Thống kê (SummaryTable trong HistoryTab)** — lấy từ database (`get_user_donation_summary` RPC) → chỉ ghi nhận giao dịch **sau khi đăng ký** và chỉ những giao dịch scanner đã quét được

Kết quả: Tổng nhận/Tổng gửi/Số giao dịch trong thẻ BTC ≠ Thống kê trong tab Lịch sử.

## Giải pháp

### 1. Thêm thống kê on-chain BTC vào SummaryTable (HistoryTab)

**File**: `src/components/wallet/tabs/HistoryTab.tsx`

Khi `selectedNetwork === 'bitcoin'`, bổ sung thêm 1 hàng "BTC (on-chain)" vào SummaryTable sử dụng dữ liệu từ hook `useBtcBalance` (cùng nguồn với AssetTab) thay vì chỉ dựa vào database. Cách này đảm bảo bảng thống kê khớp với thẻ tài sản.

- Truyền thêm props `btcOnChainReceived`, `btcOnChainSent`, `btcOnChainTxCount` vào SummaryTable
- Khi bitcoin network, ghi đè dòng BTC trong bảng bằng số liệu on-chain

### 2. Thêm nhãn phân biệt nguồn dữ liệu

**File**: `src/components/wallet/tabs/AssetTab.tsx`

Thêm nhãn nhỏ "(on-chain)" bên cạnh thống kê trong thẻ BTC để user biết đây là số liệu trực tiếp từ blockchain, không phải từ database hệ thống.

### 3. Gọi `useBtcBalance` trong HistoryTab để đồng bộ thống kê

**File**: `src/components/wallet/tabs/HistoryTab.tsx`

Import và gọi `useBtcBalance(btcAddress)` trong HistoryTab. Dùng kết quả này để:
- Override dòng BTC trong SummaryTable khi ở bitcoin network
- Hiển thị banner cảnh báo nếu số liệu on-chain khác database quá nhiều

## File cần sửa
```text
src/components/wallet/tabs/HistoryTab.tsx  — thêm useBtcBalance, override SummaryTable cho BTC
src/components/wallet/tabs/AssetTab.tsx    — thêm nhãn "(on-chain)" cho thống kê
```

