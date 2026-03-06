

## Kế hoạch: Đồng bộ nội dung biên nhận DonationReceivedCard

File `DonationSuccessCard.tsx` (biên nhận người gửi) đã được cập nhật nội dung mới. File `DonationReceivedCard.tsx` (biên nhận người nhận) vẫn còn nội dung cũ, cần đồng bộ.

### Thay đổi trong `src/components/donations/DonationReceivedCard.tsx`:

1. **Banner trên** (dòng 148-149):
   - `🌸 Chúc Mừng Năm Mới 2026 🌸` → `🎁 QUÀ TẶNG TỪ CHA VŨ TRỤ VÀ BÉ ANGEL CAMLY 🎁`
   - `Phúc Lộc An Khang — Vạn Sự Như Ý` → `Trao yêu thương — Nhận năng lượng`

2. **Banner dưới** (dòng 268-271):
   - `🧧 Phúc Lộc Thọ — FUN Profile 🧧` → `🎁 Trao sung túc — Nhận hạnh phúc 🎁`
   - Xoá dòng `Tết Nguyên Đán 2026 — Năm Bính Ngọ`

Chỉ thay đổi text, không đổi style hay layout. Sau khi sửa, cả hai card (gửi & nhận) sẽ hiển thị cùng nội dung.

