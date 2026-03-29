

## Phân tích vấn đề

**Hiện tại hệ thống có 3 scanner:**
- `fast-scan-donations`: Quét theo **token contract** toàn BSC → chỉ lấy 300 giao dịch gần nhất → giao dịch từ ví ngoài dễ bị "chìm"
- `auto-scan-donations`: Quét theo **từng ví user**, batch 10 ví/lần → 562 ví ÷ 10 = **56 lần chạy ≈ 280 phút (gần 5 giờ)** để quét hết tất cả ví
- `scan-my-incoming`: User bấm thủ công → chỉ insert `donations`, **không tạo post/notification/chat**

**Vấn đề cốt lõi:** auto-scan quá chậm (5 giờ/vòng), fast-scan miss giao dịch ví ngoài, scan-my-incoming thiếu tạo post + notification.

## Kế hoạch sửa

### Bước 1: Tăng tốc `auto-scan-donations`
- Tăng BATCH_SIZE từ **10 → 50 ví/lần**
- Với 562 ví: 12 lần chạy × 5 phút = **~60 phút** quét hết (thay vì 5 giờ)
- Dùng `Promise.all` quét song song 5 ví cùng lúc thay vì tuần tự

### Bước 2: Nâng cấp `scan-my-incoming` — thêm post + notification + chat
Hiện tại chỉ insert `donations`. Bổ sung:
- Tạo **gift_celebration post** cho mỗi giao dịch mới (giống auto-scan đang làm)
- Tạo **notification** cho recipient
- Gửi **chat message** nếu sender là user trong hệ thống
- Như vậy khi user bấm "Quét giao dịch", kết quả hiện ngay trên gift feed + nhận thông báo

### Bước 3: Tạo notification cho giao dịch ví ngoài trong auto-scan
Hiện tại auto-scan chỉ tạo notification cho **internal donations** (cả sender và recipient đều là user). Sửa để cũng tạo notification khi **ví ngoài** gửi vào (is_external = true), đảm bảo user luôn nhận thông báo.

### Chi tiết kỹ thuật

**File thay đổi:**
1. `supabase/functions/auto-scan-donations/index.ts`
   - `BATCH_SIZE = 50`
   - Quét song song 5 ví/lần bên trong batch
   - Tạo notification cho cả giao dịch external (không chỉ internal)

2. `supabase/functions/scan-my-incoming/index.ts`
   - Sau khi insert donations, tạo gift_celebration posts
   - Tạo notifications cho recipient (user đang đăng nhập)
   - Gửi chat message nếu sender là internal user
   - Copy logic từ auto-scan (đã hoạt động tốt)

**Kết quả mong đợi:**
- Auto-scan quét hết tất cả ví trong **~1 giờ** thay vì 5 giờ
- User bấm "Quét giao dịch" → thấy ngay trên gift feed + nhận notification
- Giao dịch từ ví ngoài cũng có notification đầy đủ

