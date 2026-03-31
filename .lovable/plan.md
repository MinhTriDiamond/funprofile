

## Chỉnh màu xanh stat rows trong Honor Board sang xanh lá tươi sáng

### Thay đổi

**File: `src/components/feed/AppHonorBoard.tsx`** — Dòng 185

Đổi gradient nền các stat row từ xanh đậm tối sang xanh lá tươi sáng:

- **Hiện tại:** `bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a]` (xanh rêu đậm)
- **Mới:** `bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d]` (xanh lá emerald tươi sáng)

Cũng áp dụng tương tự cho **CoverHonorBoard** (desktop `StatRow` và mobile `MobileTotalRow`) để đồng bộ:

**File: `src/components/profile/CoverHonorBoard.tsx`**
- Desktop `StatRow` (dòng ~76): đổi gradient tương tự
- Mobile `MobileTotalRow` (dòng ~162, ~170): đổi gradient tương tự

### Kết quả
Tất cả stat rows trong Honor Board sẽ có màu **xanh lá tươi sáng**, nhìn rõ ràng và sinh động hơn.

