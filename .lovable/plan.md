

## Chỉnh màu Gift Celebration Card sang xanh lá kim loại sang trọng

### Phân tích hiện tại
Card đang dùng gradient `#0d9668 → #10b981 → #0d9668 → #0a7c5a` (emerald xanh lá tươi). Cần chuyển sang tông **xanh lá kim loại sang trọng** (metallic green) — tối hơn, sâu hơn, ánh kim.

### Thay đổi

**File: `src/components/feed/GiftCelebrationCard.tsx`**

1. **Background gradient** (dòng 266): Đổi từ emerald tươi sang tông xanh lá đậm ánh kim loại:
   - `linear-gradient(135deg, #064e3b 0%, #065f46 25%, #047857 50%, #065f46 75%, #064e3b 100%)`
   - Thêm lớp overlay ánh kim metallic bằng pseudo/overlay div với shimmer effect nhẹ

2. **Thêm lớp overlay metallic** — một div absolute phía trên background với:
   - `background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.03) 100%)`
   - Tạo cảm giác ánh sáng phản chiếu trên bề mặt kim loại

3. **Border** — đổi sang tông vàng gold đậm hơn: `rgba(212, 175, 55, 0.4)` (gold metallic)

4. **Box shadow** — thêm inner glow xanh đậm để tạo chiều sâu kim loại

### Kết quả mong đợi
Card sẽ có tông xanh lá **đậm, sâu, sang trọng** kiểu kim loại thay vì xanh emerald tươi như hiện tại, giữ nguyên các hiệu ứng đồng tiền bay và glow.

