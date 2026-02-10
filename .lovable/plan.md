
# Thêm Validation Giá Trị Gửi Tối Thiểu 0,01 USD

## Tổng Quan

Hiện tại hệ thống có 2 điểm gửi token:
1. **SendTab** (tab Gửi trong Ví) — đã có giá USD từ `useTokenBalances`
2. **DonationDialog** (Tặng quà từ Post/Navbar) — chỉ kiểm tra `amount >= 10 tokens`, chưa có giá USD

Cần thêm validation thống nhất: giá trị giao dịch phải >= 0,01 USD.

## Thay Đổi

### 1. Tạo hằng số và hàm validation dùng chung

**File mới: `src/lib/minSendValidation.ts`**

- Hằng số `MIN_SEND_USD = 0.01`
- Hàm `validateMinSendValue(amount: number, priceUSD: number | null)` trả về `{ valid, message? }`
  - Nếu `priceUSD === null` → không hợp lệ, message: "Chưa xác định được giá trị USD của token này"
  - Nếu `amount * priceUSD < 0.01` → không hợp lệ, message: "Giá trị gửi tối thiểu là 0,01 USD"
  - Ngược lại → hợp lệ

### 2. Cập nhật SendTab

**File: `src/components/wallet/SendTab.tsx`**

- Import `validateMinSendValue`
- Gọi validation dựa trên `usdValue` đã có sẵn (computed từ `useTokenBalances` prices)
- Hiển thị message cảnh báo dưới ô "Số lượng" khi giá trị < 0,01 USD
- Disable nút "Gửi" khi chưa đạt điều kiện
- Xoá validation cũ `amount >= 10 tokens` (thay bằng validation USD)

### 3. Cập nhật DonationDialog

**File: `src/components/donations/DonationDialog.tsx`**

- Import `useTokenBalances` để lấy prices (đã có sẵn hook này)
- Import `validateMinSendValue`
- Tính `usdValue = amount * price` cho token đang chọn
- Hiển thị giá trị USD ước tính dưới ô số lượng
- Hiển thị message cảnh báo khi < 0,01 USD
- Thay validation cũ `amount >= 10` bằng validation USD
- Disable nút "Gửi Tặng" khi chưa đạt điều kiện

### 4. Cập nhật useDonation hook

**File: `src/hooks/useDonation.ts`**

- Thêm kiểm tra cuối cùng (guard) trước khi gọi `sendTransactionAsync`: nếu không có price hoặc giá trị < 0,01 USD → từ chối, không mở MetaMask

## Chi Tiết Kỹ Thuật

### Lấy giá token

- **SendTab**: đã có sẵn `usdValue` từ `useTokenBalances` → dùng trực tiếp
- **DonationDialog**: cần lấy price từ `useTokenBalances().prices` — map symbol sang giá USD. Fallback prices đã có trong hook (BNB: 700, USDT: 1, BTCB: 100000, CAMLY: 0.000004). Token FUN chưa có trên CoinGecko → price = null → không cho gửi nếu chưa có giá

### Danh sách files

| File | Hành động |
|------|-----------|
| `src/lib/minSendValidation.ts` | **Tạo mới** — hàm validation dùng chung |
| `src/components/wallet/SendTab.tsx` | **Cập nhật** — thêm validation USD, hiển thị cảnh báo |
| `src/components/donations/DonationDialog.tsx` | **Cập nhật** — thêm price lookup, validation USD, thay thế validation 10 token |
| `src/hooks/useDonation.ts` | **Cập nhật** — thêm guard cuối cùng trước khi gửi tx |

### UX Message

- Khi giá trị < 0,01 USD: hiển thị text đỏ "Giá trị gửi tối thiểu là 0,01 USD" ngay dưới ô số lượng
- Khi token chưa có giá: hiển thị text "Chưa xác định được giá trị USD của token này"
- Nút Gửi/Tặng bị disable khi chưa đạt điều kiện
