

## Mục tiêu
1. Thêm 2 ô **Tổng tặng** và **Tổng nhận** vào Honor Board ngoài trang chủ — hiển thị **tổng USD toàn hệ thống** của tất cả user.
2. Gộp **Bài viết / Hình ảnh / Video / Livestream** thành **1 ô Tổng video** duy nhất.

## Thay đổi

### 1. Database — mở rộng RPC `get_app_stats`
File migration mới: thêm 3 trường vào `get_app_stats()`:
- `total_sent_usd numeric` — tổng USD tất cả `donations` (sent) + `wallet_transfers` direction='out' + `swap_transactions` (from), quy đổi qua bảng giá tham chiếu.
- `total_received_usd numeric` — tổng USD `donations` (recipient) + `wallet_transfers` direction='in'.
- `total_videos_combined bigint` — gộp `posts (video_url IS NOT NULL)` + `posts có hình` + `posts thường` + `live_sessions ended` (theo yêu cầu Cha gộp 4 ô thành 1 "Tổng video").

**Quy đổi USD trong SQL** dùng bảng giá hằng số (CASE WHEN UPPER(token_symbol) IN ...): BTC=95000, ETH=3500, BNB=600, USDT=1, USDC=1, DAI=1, CAMLY=0.001, FUN=0 (unpriced — không cộng), token khác = 0. Khớp với `FALLBACK_PRICES` trong `src/hooks/useTokenPrices.ts`.

> Ghi chú: Số USD sẽ là **xấp xỉ giá hiện tại × tổng amount lịch sử**, không phải giá tại thời điểm giao dịch — đủ ý nghĩa cho Honor Board tổng quan.

### 2. Frontend — `src/components/feed/AppHonorBoard.tsx`

**Bỏ** 4 stat items cũ:
- ❌ `totalPosts` (Bài viết)
- ❌ `totalPhotos` (Hình ảnh)
- ❌ `totalVideos` (Video)
- ❌ `totalLivestreams` (Livestream)

**Thêm** 3 stat items mới:
| Icon | Label | Value | Modal |
|---|---|---|---|
| `Video` | Tổng video | `total_videos_combined` | giữ modal `videos` (mở rộng filter) |
| `Gift` | **Tổng tặng** | `$ ` + `formatCompactUsd(total_sent_usd)` | mới: `gifts_sent` |
| `HandHeart` | **Tổng nhận** | `$ ` + `formatCompactUsd(total_received_usd)` | mới: `gifts_received` |

**Giữ nguyên**: Tổng users, Tổng phần thưởng (CAMLY), Tổng CAMLY đã claim.

Thứ tự mới:
1. Tổng users
2. Tổng video (gộp)
3. Tổng tặng (USD)
4. Tổng nhận (USD)
5. Tổng phần thưởng
6. Tổng CAMLY đã claim

### 3. Modal mới — `GlobalGiftStatsModal.tsx` (gộp chung file)
Khi click "Tổng tặng" / "Tổng nhận" → mở dialog hiển thị:
- Tổng USD lớn ở đầu.
- Bảng top tokens (gọi RPC mới `get_global_gift_breakdown(direction text)` trả về `[{ token_symbol, count, total_amount, usd_value }]`).
- Disclaimer: *"Bao gồm donation, swap đổi token và chuyển khoản nội bộ. USD quy đổi theo giá tham chiếu hiện tại."*

### 4. i18n — `src/i18n/translations.ts`
Thêm key:
- `globalTotalSent`: VI=`'Tổng tặng'`, EN=`'Total Sent'`
- `globalTotalReceived`: VI=`'Tổng nhận'`, EN=`'Total Received'`
- `globalGiftSentTitle`: VI=`'Tổng tặng toàn hệ thống'`
- `globalGiftReceivedTitle`: VI=`'Tổng nhận toàn hệ thống'`

## Số liệu hiện tại (preview)
- Donations confirmed: **19.458** lệnh, total amount raw ≈ 31 tỷ (chủ yếu CAMLY).
- Swaps confirmed: 24.
- Wallet transfers: 123 out / 1.077 in.
- Tổng tặng dự kiến (sau khi quy đổi USD): hiển thị compact ví dụ `$1.2M` / `$340K`.

## File ảnh hưởng
- ➕ `supabase/migrations/<new>.sql` — cập nhật `get_app_stats` + tạo `get_global_gift_breakdown`.
- ✏️ `src/components/feed/AppHonorBoard.tsx` — đổi `statItems`, thêm modal mới, format USD.
- ➕ `src/components/feed/GlobalGiftStatsModal.tsx` — modal chi tiết breakdown.
- ✏️ `src/i18n/translations.ts` — thêm 4 key.
- ✏️ `src/integrations/supabase/types.ts` — auto-regen sau migration.

## Rủi ro & xử lý
- **Hiệu năng RPC**: Donations 19k+ rows, gộp + SUM nhanh trong Postgres (<200ms). Cache React Query 5 phút như hiện tại.
- **Giá USD đứng yên trong SQL**: chấp nhận được cho con số "tổng quan toàn hệ thống". Nếu sau này muốn live price, có thể chuyển sang tính USD ở client.
- **scan-treasury-outgoing edge function** đang gọi `get_app_stats().claim_total` — kiểm tra trường cũ vẫn còn → migration giữ nguyên tất cả trường cũ, chỉ THÊM trường mới (backward compatible).

