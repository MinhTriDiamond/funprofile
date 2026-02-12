

# Tăng cường hiệu ứng RICH text thêm nữa cho Người Gởi

## Tình trạng hiện tại
Hiệu ứng đã được nâng cấp lần 1: scale 1.5x, translateY -60px, translateX 20px, glow 80px, brightness 1.2. Tuy nhiên cần tăng thêm để chữ RICH nổi bật hơn nữa.

## Thay đổi cần thực hiện

### 1. `tailwind.config.ts` -- Tăng animation mạnh hơn
- Tăng **scale** từ 1.5x lên **1.8x** ở đỉnh nhảy
- Tăng **translateY** từ -60px lên **-80px** bay cao hơn
- Tăng **translateX** từ 20px lên **30px** lắc ngang mạnh hơn
- Giảm thời gian từ 2.5s xuống **2s** nhịp nhanh hơn, sôi động hơn

### 2. `src/components/donations/RichTextOverlay.tsx` -- Glow cực mạnh
- Tăng lớp glow cao nhất từ 80px lên **120px** blur
- Tăng brightness từ 1.2 lên **1.4**
- Tăng stroke từ 0.5px lên **1px** để viền chữ sắc nét hơn
- Thêm lớp glow 100px để chữ phát sáng rực rỡ hơn

## Kết quả mong đợi
- Chữ RICH nhảy cao hơn, to hơn, lắc mạnh hơn, nhịp nhanh hơn
- Glow effect cực mạnh, chữ phát sáng rực rỡ như đèn neon
- Đồng bộ hoàn toàn giữa Người Gởi và Người Nhận (cùng dùng RichTextOverlay)
