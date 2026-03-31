

## Thêm đồng CAMLY coin lấp lánh bay lả tả vào Gift Celebration Card

### Thay đổi

**1. Copy logo CAMLY coin vào project**
- Copy `user-uploads://photo_2023-05-15_01-42-04.jpg` → `src/assets/camly-coin.png`
- Logo này sẽ được import và dùng làm hình đồng tiền nhỏ trang trí

**2. File `src/components/feed/GiftCelebrationCard.tsx`**

Thêm lớp trang trí đồng tiền CAMLY bay lả tả bên trong card:

- **Import** logo CAMLY coin từ `src/assets/camly-coin.png`
- **Thêm 6-8 đồng tiền nhỏ** (16px-28px) ở các vị trí rải rác trong card, dùng `position: absolute`
- **CSS animation tự tạo inline**:
  - `float-coin`: bay lên xuống nhẹ nhàng (translateY ±8px), xoay nhẹ (rotate ±15deg)
  - `sparkle`: nhấp nháy opacity 0.4 → 1 → 0.4, kèm scale nhẹ
  - Mỗi đồng tiền có `animation-delay` khác nhau để tạo hiệu ứng tự nhiên, không đồng bộ
- **Vị trí**: rải ở góc trên trái, trên phải, dưới trái, dưới phải, và 2-3 vị trí giữa card
- **Opacity mặc định**: 0.5-0.8 để không che nội dung chính
- **pointer-events: none** để không ảnh hưởng tương tác

**3. File `tailwind.config.ts`** (nếu cần)
- Thêm keyframes `float-coin` và `sparkle-coin` vào config animation

### Kết quả mong đợi
- Nhiều đồng tiền CAMLY nhỏ lấp lánh, bay lả tả nhẹ nhàng trong card
- Tạo cảm giác sang trọng, sống động mà không che nội dung
- Chỉ sửa 1-2 file, không ảnh hưởng logic hiện tại

