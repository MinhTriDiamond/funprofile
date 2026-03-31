

## Nâng cấp màu sắc Gift Celebration Card sang trọng hơn + hiệu ứng "lệnh mới"

### Hiện tại
Card dùng gradient xanh emerald đơn giản: `linear-gradient(135deg, #10b981, #059669, #047857)` — trông phẳng, chưa sang trọng.

### Thay đổi

**File `src/components/feed/GiftCelebrationCard.tsx`**

1. **Nâng cấp gradient nền sang trọng hơn**
   - Đổi sang gradient xanh đậm pha vàng gold, kiểu "emerald + dark green + gold shimmer":
   ```
   linear-gradient(135deg, #064e3b 0%, #047857 30%, #065f46 60%, #064e3b 100%)
   ```
   - Thêm border subtle vàng gold: `border: 1px solid rgba(255, 215, 0, 0.25)`

2. **Hiệu ứng "lệnh mới" — glow vàng nổi bật khi post mới (< 60 giây)**
   - Thêm logic check: nếu `created_at` cách hiện tại < 60s → đánh dấu `isNew = true`
   - Khi `isNew`:
     - Thêm class `animate-glow-pulse` (đã có sẵn trong tailwind config)
     - Border vàng sáng hơn: `border: 2px solid rgba(255, 215, 0, 0.6)`
     - BoxShadow vàng rực: `0 0 25px rgba(255, 215, 0, 0.4), 0 0 50px rgba(255, 215, 0, 0.2)`
     - Thêm badge nhỏ "✨ Mới" góc trên phải, nền vàng gold
   - Sau 60s tự tắt hiệu ứng (dùng setTimeout)

3. **Tinh chỉnh chi tiết sang trọng**
   - Ring avatar đổi sang vàng gold nhạt thay vì white/40
   - Arrow icon + Gift icon giữ vàng gold
   - Text amount giữ `text-yellow-300` (đã có)

### Kết quả
- Card nền xanh đậm sang trọng hơn, có điểm nhấn vàng gold
- Lệnh mới xuất hiện sẽ **phát sáng vàng rực**, dễ phân biệt ngay lập tức
- Sau 60s hiệu ứng tắt, card trở về trạng thái bình thường

### File thay đổi
- `src/components/feed/GiftCelebrationCard.tsx` — duy nhất

