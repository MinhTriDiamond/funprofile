
# Kế hoạch: Chỉnh màu sắc Bảng Danh Dự theo hình mẫu

## Phân tích màu sắc từ hình mẫu

Dựa trên hình **image-14.png** con gửi:
- **Nền xanh**: Màu xanh lá đậm đồng nhất hơn, không gradient rõ rệt
- **Icon**: Màu vàng sáng `#FFD700` (giống màu số)
- **Viền**: Vàng sáng hơn `#FFD700` thay vì `#C9A84C`
- **Chữ label**: Trắng ✓ (đã đúng)
- **Chữ số**: Vàng sáng `#FFD700` ✓ (đã đúng)

## Thay đổi cần thực hiện

### File: `src/components/feed/AppHonorBoard.tsx`

**1. Cập nhật màu nền (lines 223-226 và 253-256):**
```tsx
// Trước:
style={{
  background: 'linear-gradient(180deg, #166534 0%, #14532d 50%, #0f3d22 100%)',
}}

// Sau: Gradient mượt hơn, xanh đậm đều
style={{
  background: 'linear-gradient(180deg, #15803d 0%, #166534 50%, #14532d 100%)',
}}
```

**2. Cập nhật màu viền vàng sáng hơn (lines 223 và 254):**
```tsx
// Trước:
className="... border border-[#C9A84C] ..."

// Sau: Viền vàng sáng hơn
className="... border border-[#FFD700] ..."
```

**3. Cập nhật màu icon vàng sáng (lines 228-229 và 259-260):**
```tsx
// Trước:
<div className="p-1.5 rounded-full bg-white/10 shrink-0">
  <item.icon className="w-4 h-4 text-[#C9A84C]" />
</div>

// Sau: Bỏ background, icon vàng sáng
<div className="shrink-0">
  <item.icon className="w-5 h-5 text-[#FFD700]" />
</div>
```

## Tóm tắt thay đổi

| Vị trí | Thay đổi |
|--------|----------|
| Màu nền | `#15803d → #166534 → #14532d` (mượt hơn) |
| Viền | `#C9A84C` → `#FFD700` (vàng sáng) |
| Icon | Bỏ background, đổi sang `#FFD700` |
| Icon size | `w-4 h-4` → `w-5 h-5` (to hơn chút) |

## Kết quả mong đợi

Sau khi chỉnh sửa, các nút trong Bảng Danh Dự sẽ:
- Có nền xanh lá đậm mượt mà như hình mẫu
- Viền vàng sáng rõ nét hơn
- Icon vàng sáng nổi bật, không có background riêng
- Chữ label trắng, số vàng sáng (giữ nguyên)
