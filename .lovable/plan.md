

## Vấn đề phát hiện

Hai con số trong UI **không khớp** vì lấy từ 2 nguồn khác nhau:

| Mục | Nguồn | Phạm vi |
|---|---|---|
| **Honor Board → Tổng tặng / Tổng nhận** | `useGiftBreakdown` query bảng `donations` | Chỉ quà tặng (donation) |
| **Lịch sử giao dịch cá nhân (bảng tổng)** | RPC `get_user_donation_summary` | `donations` + `swap_transactions` + `wallet_transfers` (gộp tất cả luồng tiền) |

### Số liệu thực tế (user `angelaivan`)

| Token | Donation thuần (Honor Board) | Tổng cộng (Lịch sử) | Chênh = swap+transfer |
|---|---|---|---|
| Received CAMLY | 153 / 310,217,810 | 155 / 320,796,348 | +2 / +10.6M |
| Received USDT | 34 / 1,056 | 35 / 2,376.69 | +1 / +1,320 |
| Received BTC | 5 / 0.1235 | 5 / 0.1235 | (giống) |
| Received FUN | 8 / 2,682 | 8 / 2,682 | (giống) |
| Sent USDT | 57 / 1,505.20 | 60 / 1,855.20 | +3 / +350 |
| Sent BTC | 17 / 0.0053 | 18 / 0.0203 | +1 / +0.015 |
| Sent CAMLY | 169 / 77,578,815 | 169 / 77,578,815 | (giống) |
| Sent BNB | 5 / 0.2082 | 5 / 0.2082 | (giống) |

**Kết luận:** Cả 2 con số đều **chính xác** với định nghĩa của chính nó. Vấn đề là **nhãn UI gây hiểu nhầm** — người dùng tưởng cùng một thứ.

## Phương án xử lý

Đổi cách trình bày để 2 nơi nhất quán và rõ nghĩa, **không thay đổi logic tính toán**:

### Thay đổi 1: Honor Board — đổi nhãn dialog
File `src/components/profile/GiftBreakdownDialog.tsx`:
- Tiêu đề "Tổng Tặng" → **"Tổng Quà Đã Tặng"**
- Tiêu đề "Tổng Nhận" → **"Tổng Quà Đã Nhận"**
- Thêm dòng mô tả phụ ngay dưới tiêu đề: *"Chỉ tính các giao dịch tặng quà (donation). Để xem cả swap và chuyển khoản, mở Lịch sử giao dịch."*
- Thêm link "Xem lịch sử giao dịch đầy đủ" đã có sẵn → giữ nguyên

### Thay đổi 2: Honor Board — đổi nhãn 2 ô tổng
File `src/components/profile/CoverHonorBoard.tsx` (Desktop + MobileStats):
- "Tổng tặng" → **"Quà đã tặng"**
- "Tổng nhận" → **"Quà đã nhận"**

### Thay đổi 3: Lịch sử giao dịch — làm rõ nhãn cột
File `src/components/profile/WalletTransactionHistory.tsx`:
- Cột "Tổng nhận" → **"Tổng nhận (gồm swap)"** với tooltip giải thích gồm donation + swap + chuyển khoản
- Cột "Tổng đã tặng" → **"Tổng đã gửi (gồm swap)"** với tooltip tương tự

### Thay đổi 4: i18n
Cập nhật `src/i18n/translations.ts` — thêm các key mới `giftSentTotal`, `giftReceivedTotal`, `giftBreakdownNote`, `historyTotalReceivedHint`, `historyTotalSentHint` cho cả `vi` và `en`.

## Kiểm chứng sau triển khai

1. Mở `/angelaivan` → Honor Board hiển thị "Quà đã tặng / Quà đã nhận" với số $2,549.50 / $12,443.07.
2. Bấm vào → dialog "Tổng Quà Đã Tặng / Nhận" + dòng giải thích phạm vi.
3. Mở Lịch sử giao dịch → cột "Tổng nhận (gồm swap)" với tooltip rõ.
4. Số liệu DB không đổi — chỉ nhãn UI thay đổi để nhất quán định nghĩa.

## Ghi chú quan trọng

- **Không sửa RPC** `get_user_donation_summary` để tránh phá vỡ các nơi khác đang dùng.
- **Không gộp 2 nguồn** trong Honor Board vì swap/transfer không phải hành động "tặng quà" — gộp vào sẽ làm mục đích Honor Board (vinh danh tặng/nhận quà) bị nhiễu.

