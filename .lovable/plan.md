
# Hợp Nhất Dialog "Gửi" và "Tặng" Thành 1 Component Duy Nhất

## Tổng Quan

Hiện tại có 2 dialog riêng biệt:
- **Ảnh 1 (SendTab)**: Dialog đơn giản trong `/wallet`, chỉ có chọn token + nhập address + nhập amount
- **Ảnh 2 (DonationDialog)**: Dialog đầy đủ với tên hiển thị, token grid lớn, quick amount chips, lời nhắn mẫu, emoji, avatar người nhận

Mục tiêu: Tạo **1 component duy nhất** theo UI ảnh 2, dùng cho tất cả 3 ngữ cảnh (wallet send, post gift, navbar gift).

## Thay Đổi

### 1. Tạo component mới: `UnifiedGiftSendDialog`

**File mới: `src/components/donations/UnifiedGiftSendDialog.tsx`**

Component này kết hợp UI của DonationDialog (ảnh 2) với khả năng nhập address tự do (từ SendTab):

- Props:
  - `isOpen`, `onClose`
  - `mode: 'wallet' | 'post' | 'navbar'`
  - `presetRecipient?: { id?, username?, avatarUrl?, walletAddress? }`
  - `postId?: string`
  - `onSuccess?: () => void`
- Tiêu đề thay đổi theo mode:
  - Có recipient: "Tặng quà cho @username"
  - Không có recipient (wallet mode): "Gửi token"
- Khi `mode = 'wallet'`: hiện ô input "Địa chỉ nhận (0x...)" thay vì khu "Gửi đến" cố định
- Khi `mode = 'post'`: recipient preset, khu "Gửi đến" hiển thị avatar + address (không sửa được)
- Khi `mode = 'navbar'`: recipient đã chọn từ GiftNavButton trước khi mở dialog

Logic gửi on-chain:
- Dùng `useSendToken` (state machine đã sửa) cho tất cả — thay vì `useDonation`
- Ghi log DB qua edge function `record-donation` (nếu có recipientId) hoặc insert `transactions` (nếu mode wallet)
- Tích hợp DonationSuccessCard khi có recipientId
- Validation: `validateMinSendValue` + address checksum + balance check + gas warning

### 2. Cập nhật `WalletCenterContainer` — thay SendTab bằng UnifiedGiftSendDialog

**File: `src/components/wallet/WalletCenterContainer.tsx`**

- Thay block Dialog "Gửi tiền" chứa `<SendTab />` bằng `<UnifiedGiftSendDialog mode="wallet" />`
- Xoá import SendTab

### 3. Cập nhật `DonationButton` — dùng UnifiedGiftSendDialog

**File: `src/components/donations/DonationButton.tsx`**

- Thay `DonationDialog` bằng `UnifiedGiftSendDialog` với `mode="post"` và `presetRecipient`

### 4. Cập nhật `GiftNavButton` — dùng UnifiedGiftSendDialog

**File: `src/components/donations/GiftNavButton.tsx`**

- Thay `DonationDialog` bằng `UnifiedGiftSendDialog` với `mode="navbar"` và `presetRecipient`

### 5. Giữ nguyên nhưng retire files cũ

- `SendTab.tsx` — không còn dùng (có thể xoá hoặc giữ tạm)
- `SendConfirmModal.tsx` — không còn dùng
- `DonationDialog.tsx` — không còn dùng

## Chi Tiết Kỹ Thuật

### UnifiedGiftSendDialog — Cấu trúc UI (giống ảnh 2)

```text
+------------------------------------------+
| [Gift icon] Tặng quà cho @username       | (hoặc "Gửi token" nếu wallet mode)
+------------------------------------------+
| Tên hiển thị (tùy chọn): [input]         | (optional, ẩn bớt ở wallet mode)
|                                          |
| Chọn token:                              |
| [FUN] [CAMLY] [BNB]                      |
| [USDT] [BTCB] [+Khác]                   |
|                                          |
| [Nếu wallet mode: Địa chỉ nhận: 0x...]  |
|                                          |
| Số lượng:                                |
| [input] .............. [symbol] [MAX]    |
| So du: xxx | ~ $x.xx USD                 |
|                                          |
| Số lượng nhanh: [10][50][100][500][1000] |
|                                          |
| Lời nhắn mẫu:                           |
| [Biết ơn][Yêu thương][Ngưỡng mộ]        |
| [Ủng hộ][Khích lệ][Tùy chỉnh]          |
|                                          |
| Lời nhắn: [textarea] [emoji]            |
|                                          |
| Gửi đến: [avatar] 0x746b2f...685eb6 [copy] |
|                                          |
| [Huỷ]              [Gửi Tặng xxx FUN]   |
+------------------------------------------+
```

### Logic gửi on-chain thống nhất

Component sẽ dùng `useSendToken` hook (đã có state machine + timeout) cho phần gửi on-chain. Sau khi gửi thành công:
- Nếu có `recipientId` (post/navbar mode): gọi edge function `record-donation` để ghi nhận tặng thưởng + hiện DonationSuccessCard
- Nếu chỉ là wallet send (không có recipientId): insert vào bảng `transactions` + toast thành công

### Xử lý "Người nhận chưa có ví" (chỉ post/navbar mode)

Giữ nguyên logic hiện tại: hiện cảnh báo + nút "Hướng Dẫn Nhận Quà" gọi `notify-gift-ready`.

### Danh sách files

| File | Hành động |
|------|-----------|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | **Tạo mới** — component thống nhất |
| `src/components/wallet/WalletCenterContainer.tsx` | **Cập nhật** — dùng UnifiedGiftSendDialog thay SendTab |
| `src/components/donations/DonationButton.tsx` | **Cập nhật** — dùng UnifiedGiftSendDialog thay DonationDialog |
| `src/components/donations/GiftNavButton.tsx` | **Cập nhật** — dùng UnifiedGiftSendDialog thay DonationDialog |
| `src/components/wallet/SendTab.tsx` | **Xoá** (retire) |
| `src/components/wallet/SendConfirmModal.tsx` | **Xoá** (retire) |
| `src/components/donations/DonationDialog.tsx` | **Xoá** (retire) |

### Tái sử dụng components hiện có

- `TokenSelector` + `SUPPORTED_TOKENS` — giữ nguyên (UI grid 3 cột + nút "Khác")
- `QuickGiftPicker` + `MESSAGE_TEMPLATES` + `QUICK_AMOUNTS` — giữ nguyên
- `DonationSuccessCard` — giữ nguyên (celebration card)
- `EmojiPicker` — giữ nguyên
- `useSendToken` — dùng cho on-chain send (state machine + timeout)
- `validateMinSendValue` — dùng cho validation USD tối thiểu
