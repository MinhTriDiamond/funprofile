

# Đồng bộ số dư BTC giữa ví điện thoại và app

## Nguyên nhân lệch số dư

Ví trên điện thoại (Trust Wallet, Exodus...) sử dụng **HD wallet** — tạo nhiều địa chỉ BTC từ cùng 1 seed phrase. Tổng số dư = tổng tất cả địa chỉ. App Fun.Rich chỉ theo dõi **1 địa chỉ** (`btc_address` trong profile).

```text
Ví điện thoại (HD wallet):
  Địa chỉ 1: bc1qdl98h... → 0.00001230 BTC ← App chỉ thấy cái này
  Địa chỉ 2: bc1q.....   → 0.00002500 BTC
  Địa chỉ 3: bc1q.....   → 0.00001269 BTC
  ─────────────────────────────────────────
  Tổng:                     0.00004999 BTC ← Ví điện thoại thấy tổng
```

## Giải pháp: Hỗ trợ nhiều địa chỉ BTC

### 1. Mở rộng profile hỗ trợ thêm địa chỉ BTC phụ
- Thêm cột `btc_addresses` (jsonb array) vào bảng `profiles` để lưu danh sách địa chỉ BTC bổ sung
- Migration SQL: `ALTER TABLE profiles ADD COLUMN btc_addresses jsonb DEFAULT '[]'::jsonb;`

### 2. Cập nhật UI thêm địa chỉ BTC trong Edit Profile
- Trong trang EditProfile, thêm mục "Địa chỉ BTC phụ" cho phép nhập thêm các địa chỉ BTC khác từ cùng ví HD

### 3. Mở rộng hook `useBtcBalance` tổng hợp nhiều địa chỉ
- Fetch song song số dư từ tất cả địa chỉ (chính + phụ)
- Tổng hợp balance, totalReceived, totalSent, txCount

### 4. Cập nhật `useBtcTransactions` gộp lịch sử
- Fetch transactions từ tất cả địa chỉ
- Sắp xếp theo thời gian, loại bỏ trùng lặp (cùng txid)

## Lịch sử giao dịch BTC
Tính năng này **đã có sẵn** trong tab "Lịch sử" (HistoryTab) khi chọn mạng Bitcoin — hiển thị đầy đủ:
- Loại giao dịch (Nhận/Gửi) với icon màu
- Số lượng BTC (8 decimals) + giá USD
- Thời gian chi tiết
- Trạng thái (Confirmed/Pending)
- Link đến Mempool.space

## File cần sửa
```text
1. Migration SQL — thêm cột btc_addresses
2. src/hooks/useBtcBalance.ts — tổng hợp nhiều địa chỉ
3. src/hooks/useBtcTransactions.ts — gộp giao dịch nhiều địa chỉ
4. src/components/profile/EditProfileForm.tsx — UI thêm địa chỉ BTC phụ
5. src/components/wallet/tabs/AssetTab.tsx — hiển thị tổng hợp
```

