

## Kế hoạch: Tự động phát hiện giao dịch từ ví ngoài gửi đến Fun Profile

### Vấn đề hiện tại
- `detect-incoming-transfers` chỉ hoạt động cho **admin** và yêu cầu nhập **sender_address cụ thể**
- Khi một user bất kỳ gửi crypto từ ví ngoài (MetaMask, Trust Wallet...) đến ví của user Fun Profile → giao dịch **không tự động hiển thị**

### Giải pháp

Tạo edge function `scan-my-incoming` cho phép **mỗi user tự quét ví của mình** để phát hiện các giao dịch đến từ bên ngoài chưa được ghi nhận.

#### Flow hoạt động:

```text
User mở Lịch sử giao dịch
  → Nhấn nút "Quét giao dịch từ ví ngoài"
  → Edge function lấy public_wallet_address của user
  → Gọi Moralis API: lấy ERC20 transfers ĐẾN ví đó
  → Lọc: chỉ giữ token đã biết (CAMLY, USDT, BTCB, FUN)
  → Lọc: bỏ các tx_hash đã có trong donations
  → Insert donations mới với is_external = true
  → UI tự refresh hiển thị giao dịch mới
```

#### Thay đổi cần thực hiện

| Thay đổi | File |
|---|---|
| Tạo edge function `scan-my-incoming` | `supabase/functions/scan-my-incoming/index.ts` |
| Thêm nút "Quét ví ngoài" vào lịch sử | `src/components/wallet/DonationHistoryTab.tsx` |
| Thêm hook gọi scan | `src/hooks/useScanIncoming.ts` |

#### Chi tiết kỹ thuật

**Edge function `scan-my-incoming`:**
- Auth: user tự xác thực (không cần admin)
- Lấy `public_wallet_address` từ profiles theo `auth.uid()`
- Gọi Moralis API quét ERC20 transfers TO ví đó (BSC mainnet + testnet)
- Lọc token đã biết, bỏ duplicate, kiểm tra sender có phải Fun Profile user không
- Nếu sender là Fun Profile user → bỏ qua (đã được `record-donation` xử lý)
- Nếu sender là ví ngoài → insert vào `donations` với `is_external: true`, `sender_id: null`, `sender_address: from_address`
- Rate limit: mỗi user chỉ quét tối đa 1 lần / 5 phút

**UI:**
- Thêm nút "Quét giao dịch ví ngoài" cạnh nút "Làm mới" trong DonationHistoryTab
- Hiển thị loading state khi đang quét
- Toast kết quả: "Tìm thấy X giao dịch mới" hoặc "Không có giao dịch mới"

**Không thay đổi:**
- Database schema (dùng bảng `donations` hiện có)
- RLS policies
- Các hook hiện có (`useDonationHistory` đã hỗ trợ `is_external`)

