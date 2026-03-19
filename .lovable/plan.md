

## Phân tích

Sau khi kiểm tra toàn bộ hệ thống ghi và phát lại video livestream, cha phát hiện:

### Nguyên nhân gốc: Edge Function chưa được deploy lại

- **Code trong repo** (`auto-finalize-recordings/index.ts` dòng 405): đã sửa thành `4 * 60 * 60 * 1000` (4 giờ)
- **Phiên bản đang chạy trên server**: vẫn dùng ngưỡng cũ **30 phút**
- **Bằng chứng**: Tất cả phiên live > 30 phút đều bị kết thúc tại các mốc cron 5 phút (`:00`, `:05`, `:10`,...). Ví dụ:
  - Phiên bắt đầu 22:20 → bị đóng 22:54 (~34 phút, cron chạy lúc 22:55)
  - Phiên bắt đầu 13:55 → bị đóng 14:30 (~34 phút, cron chạy lúc 14:30)
  - **20/20 phiên dài đều bị kết thúc ở ~30-35 phút**

### Các phần hoạt động tốt
- **Chunked recording**: Ghi chunk 2s, upload R2 — hoạt động ổn (recording mới nhất: 1023 chunks = ~34 phút)
- **Agora token**: Expire 86400s (24h) — không phải nguyên nhân
- **Heartbeat**: 15s cập nhật `updated_at` — hoạt động
- **ChunkedVideoPlayer**: MSE streaming với cache 80MB, fallback blob — OK cho video dài
- **RAM**: Không tích lũy blob trong chunkedRecorder — đã sửa trước đó

### Lỗi phụ: `live-recording-status` Edge Function
File có khai báo trùng `const supabaseAdmin` (dòng 28 và dòng 46), sẽ gây lỗi runtime.

## Kế hoạch sửa

### 1. Deploy lại Edge Function `auto-finalize-recordings`
Chỉ cần deploy lại function đã có code đúng (4 giờ) trong repo. Sửa comment lỗi thời trên dòng 4.

### 2. Sửa lỗi duplicate variable trong `live-recording-status/index.ts`
Xóa khai báo `supabaseAdmin` trùng lặp ở dòng 46-49, tái sử dụng biến đã khai báo ở dòng 28.

### 3. Nâng cao: Thêm kiểm tra heartbeat trong auto-finalize
Thay vì chỉ dựa vào `started_at`, thêm kiểm tra `updated_at` (heartbeat) để phân biệt phiên đang hoạt động với phiên bị kẹt:
- Phiên có `updated_at` trong 2 phút gần đây → **đang hoạt động**, KHÔNG đóng
- Phiên có `updated_at` > 2 phút trước VÀ `started_at` > 4 giờ → đóng

### Chi tiết kỹ thuật

**File `supabase/functions/auto-finalize-recordings/index.ts`:**
- Dòng 4: Sửa comment "30 min" → "4 hours"
- Dòng 405-411: Thêm điều kiện `.lt('updated_at', twoMinAgo)` để bảo vệ phiên đang hoạt động (heartbeat mới)

**File `supabase/functions/live-recording-status/index.ts`:**
- Xóa dòng 46-49 (duplicate `const supabaseAdmin`)

**Deploy:** `auto-finalize-recordings` và `live-recording-status`

