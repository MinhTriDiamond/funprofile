

## Nâng cấp màu card Gift Celebration: xanh kim loại pha tia sáng vàng kim

### Thay đổi

**File `src/components/feed/GiftCelebrationCard.tsx`**

1. **Đổi gradient nền** từ xanh đậm thuần sang xanh kim loại (metallic teal) pha ánh vàng gold:
   ```
   linear-gradient(135deg, #0d3b2e 0%, #0f5132 20%, #1a7a5a 45%, #d4a937 50%, #1a7a5a 55%, #0f5132 80%, #0d3b2e 100%)
   ```
   Dải vàng ở giữa (45%-55%) tạo hiệu ứng "tia sáng vàng kim" chiếu xéo qua nền xanh.

2. **Thêm lớp pseudo-overlay bằng CSS** cho hiệu ứng ánh kim loại (metallic sheen):
   - Dùng `::before` hoặc inline style thêm một gradient overlay mỏng:
     ```
     background: linear-gradient(110deg, transparent 30%, rgba(255,215,0,0.08) 45%, rgba(255,215,0,0.15) 50%, rgba(255,215,0,0.08) 55%, transparent 70%)
     ```
   - Tạo cảm giác tia sáng vàng lấp lánh trên bề mặt xanh.

3. **Border** đổi sang vàng kim rõ hơn:
   - Bình thường: `1px solid rgba(212, 169, 55, 0.35)`
   - Khi mới (`isNew`): `2px solid rgba(255, 215, 0, 0.7)`

4. **BoxShadow** thêm ánh vàng nhẹ mặc định:
   - `0 2px 15px rgba(212, 169, 55, 0.15), 0 2px 10px rgba(0,0,0,0.1)`

### Không thay đổi
- Logic `isNew`, badge "✨ Mới", confetti, sound — giữ nguyên
- Nội dung bên trong card (avatar, text, nút) — giữ nguyên
- Các file khác — không đổi

