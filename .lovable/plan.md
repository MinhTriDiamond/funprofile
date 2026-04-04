

# Hiển thị số dư BTC thực tế + Thông báo push khi có giao dịch BTC mới

## Phân tích hiện trạng

1. **Số dư BTC**: Hook `useBtcBalance` đã hoạt động đúng — fetch từ Mempool.space với retry + fallback Blockstream, auto-refresh 60s, refresh khi tab visible. Số dư hiển thị chính xác theo on-chain. Tuy nhiên chỉ trả về 1 con số `balance`, thiếu thông tin chi tiết (tổng nhận, tổng gửi).

2. **Đồng bộ desktop/mobile**: Cả hai đều dùng cùng `btc_address` từ profile database → gọi cùng Mempool API → **đã đồng bộ tự nhiên**. Không cần sửa.

3. **Push notification**: Hiện tại hệ thống **chưa có** Web Push. Khi scanner phát hiện giao dịch BTC mới, chỉ tạo notification trong database (hiển thị khi user mở app). Chưa có khả năng gửi thông báo đẩy khi user không mở app.

## Kế hoạch thực hiện

### 1. Mở rộng hook `useBtcBalance` — hiển thị chi tiết

**File**: `src/hooks/useBtcBalance.ts`

Thay vì chỉ trả `balance: number`, trả thêm:
- `totalReceived` — tổng BTC từng nhận
- `totalSent` — tổng BTC đã gửi đi
- `txCount` — số giao dịch

```typescript
interface BtcBalanceDetails {
  balance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
}
```

Parse thêm từ API response (đã có sẵn trong data):
```text
totalReceived = (chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum) / 1e8
totalSent = (chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum) / 1e8
txCount = chain_stats.tx_count + mempool_stats.tx_count
```

### 2. Cập nhật UI thẻ BTC trong AssetTab

**File**: `src/components/wallet/tabs/AssetTab.tsx`

Thêm phần hiển thị chi tiết bên dưới số dư chính (cả 2 view: bitcoin network và EVM):

```text
┌─────────────────────────────────┐
│ BTC                             │
│ Số dư: 0.00021230 BTC  ($21.12) │
│ ─────────────────────────────── │
│ 📥 Tổng nhận: 0.00042460 BTC   │
│ 📤 Tổng gửi:  0.00021230 BTC   │
│ 🔄 Giao dịch: 5                │
└─────────────────────────────────┘
```

### 3. Thêm toast thông báo realtime khi có giao dịch BTC mới

**File**: `src/hooks/useBtcBalance.ts`

So sánh balance mới với balance cũ mỗi lần refresh (60s). Nếu balance tăng → hiện toast:
```typescript
if (newBalance > prevBalance && prevBalance !== null) {
  toast.success(`📥 Nhận ${(newBalance - prevBalance).toFixed(8)} BTC mới!`);
}
```

### 4. Thêm in-app notification realtime cho BTC

**File**: Tận dụng Realtime subscription trên bảng `notifications`

Thêm listener realtime trong component Notification hiện có để phát hiện notification mới loại `donation` với token BTC → hiện toast push ngay lập tức khi scanner ghi nhận giao dịch mới, kể cả khi user đang ở trang khác trong app.

## Ghi chú về Web Push (ngoài app)

Web Push thực sự (khi user đóng app/trình duyệt) cần:
- Service Worker + VAPID keys + push subscription endpoint
- Edge function gửi push qua web-push protocol

Đây là tính năng phức tạp hơn. Trong kế hoạch này, mình sẽ tập trung vào **in-app realtime toast** trước. Web Push ngoài app có thể bổ sung sau nếu con cần.

## File cần sửa
```text
src/hooks/useBtcBalance.ts
src/components/wallet/tabs/AssetTab.tsx
```

