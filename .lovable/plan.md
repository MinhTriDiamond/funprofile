
# Kế hoạch: Tạo style Royal Premium cho tất cả nút

## Phân tích hình mẫu

Từ hình con gửi, các nút có đặc điểm:
- **Nền**: Gradient xanh lá đậm với hiệu ứng glossy (từ `#0d4a2a` qua `#166534` đến `#1a7d45`)
- **Inner glow**: Có ánh sáng trắng nhẹ ở phía trên tạo độ bóng
- **Viền vàng 3D**: Gradient vàng kim loại (`#D4AF37` → `#FFD700` → `#B8860B`) với hiệu ứng bevel
- **Chữ**: Màu vàng nhạt kim loại (`#E8D5A3` hoặc `#F5DEB3`)
- **Shadow**: Có bóng đổ nhẹ tạo chiều sâu

---

## Files cần chỉnh sửa

### 1. `src/components/ui/button.tsx` - Button Component
Cập nhật tất cả variants với style Royal Premium:

**Thay đổi chính:**
- Background: Gradient glossy xanh lá với inner highlight
- Border: Gradient vàng kim loại 3D (sử dụng box-shadow layers)
- Text: Màu vàng nhạt kim loại
- Shadow: Metallic gold glow

### 2. `src/components/feed/AppHonorBoard.tsx` - Stat Items
Cập nhật các stat items trong Bảng Danh Dự:

**Thay đổi chính:**
- Background: Gradient glossy xanh lá
- Border: Metallic gold 3D effect
- Labels: Vàng nhạt kim loại
- Values: Vàng sáng hơn một chút

### 3. `src/components/profile/CoverHonorBoard.tsx` - Profile Stats
Cập nhật StatRow component với style tương tự

---

## Chi tiết kỹ thuật

### Màu sắc chuẩn

```css
/* Nền Gradient Glossy */
background: linear-gradient(
  180deg, 
  #1a7d45 0%,     /* Sáng ở trên */
  #166534 30%,    /* Chính giữa */
  #0d4a2a 100%    /* Đậm ở dưới */
);

/* Inner Highlight - tạo độ bóng */
box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 
            inset 0 -1px 0 rgba(0,0,0,0.2);

/* Viền vàng kim loại 3D */
border: 2px solid;
border-image: linear-gradient(
  180deg,
  #FFD700 0%,     /* Vàng sáng ở trên */
  #DAA520 50%,    /* Vàng đậm ở giữa */
  #B8860B 100%    /* Vàng tối ở dưới */
) 1;

/* Hoặc dùng box-shadow layers cho rounded corners */
box-shadow: 
  0 0 0 2px #DAA520,                           /* Viền chính */
  inset 0 1px 0 rgba(255,255,255,0.2),         /* Inner highlight top */
  0 2px 4px rgba(0,0,0,0.3),                   /* Drop shadow */
  0 0 8px rgba(218,165,32,0.3);                /* Gold glow */

/* Màu chữ vàng nhạt kim loại */
color: #E8D5A3;  /* Wheat/Champagne - cho labels */
color: #FFD700;  /* Gold - cho values/số liệu */
```

### button.tsx - Các variants mới

```tsx
variants: {
  variant: {
    // Royal Premium - Glossy Green với Metallic Gold Border
    default: `
      bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a]
      text-[#E8D5A3] font-semibold rounded-full
      border-[2px] border-[#DAA520]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.15),0_0_8px_rgba(218,165,32,0.4),0_2px_4px_rgba(0,0,0,0.2)]
      hover:from-[#1d8a4c] hover:via-[#188639] hover:to-[#0e5530]
      hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_12px_rgba(218,165,32,0.5),0_3px_6px_rgba(0,0,0,0.25)]
      hover:scale-[1.02] duration-300
    `,
    
    premium: `
      bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a]
      text-[#FFD700] font-bold rounded-full
      border-[2px] border-[#DAA520]
      shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(255,215,0,0.5),0_3px_8px_rgba(0,0,0,0.3)]
      hover:from-[#1d8a4c] hover:via-[#188639] hover:to-[#0e5530]
      hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_0_16px_rgba(255,215,0,0.6),0_4px_12px_rgba(0,0,0,0.35)]
      hover:scale-[1.03] duration-300
    `,
    
    // Outline giữ nguyên viền vàng nhưng nền trong suốt
    outline: `
      bg-transparent text-[#DAA520] font-semibold rounded-full
      border-[2px] border-[#DAA520]
      shadow-[0_0_6px_rgba(218,165,32,0.3)]
      hover:bg-[#166534]/20 hover:text-[#FFD700]
      hover:shadow-[0_0_10px_rgba(218,165,32,0.5)]
      duration-300
    `,
    
    // Secondary - Nền kem nhạt với viền vàng
    secondary: `
      bg-gradient-to-b from-[#f8f6f0] to-[#f0ede4]
      text-[#166534] font-semibold rounded-full
      border-[2px] border-[#DAA520]/60
      shadow-[0_0_4px_rgba(218,165,32,0.2)]
      hover:border-[#DAA520]
      hover:shadow-[0_0_8px_rgba(218,165,32,0.4)]
      duration-300
    `,
    
    // Destructive - Đỏ với viền vàng
    destructive: `
      bg-gradient-to-b from-[#dc2626] via-[#b91c1c] to-[#991b1b]
      text-white font-semibold rounded-full
      border-[2px] border-[#DAA520]/50
      shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
      hover:from-[#ef4444] hover:via-[#dc2626] hover:to-[#b91c1c]
      duration-300
    `,
    
    // Ghost - Trong suốt, chỉ hiện khi hover
    ghost: `
      text-[#DAA520] rounded-full
      hover:bg-[#166534]/15 hover:text-[#FFD700]
      border-[2px] border-transparent
      hover:border-[#DAA520]/40
      duration-300
    `,
    
    link: "text-[#DAA520] underline-offset-4 hover:underline hover:text-[#FFD700] rounded-full",
    
    // Light variant - nhẹ nhàng hơn
    light: `
      bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a]
      text-[#E8D5A3] font-semibold rounded-full
      border-[1.5px] border-[#DAA520]/70
      shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_6px_rgba(218,165,32,0.3)]
      hover:border-[#DAA520]
      hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_10px_rgba(218,165,32,0.5)]
      duration-300
    `,
  },
}
```

### AppHonorBoard.tsx - Stat Items

```tsx
// Dòng 223 - Stat item className
className="flex items-center gap-3 py-2.5 px-4 rounded-full 
  bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a]
  border-[2px] border-[#DAA520]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.15),0_0_8px_rgba(218,165,32,0.4)]
  transition-all duration-300 hover:scale-[1.02] cursor-pointer"

// Icon container
className="p-1.5 rounded-full bg-white/10 shrink-0"

// Icon
className="w-4 h-4 text-[#E8D5A3]"

// Label
className="text-[#E8D5A3] text-xs uppercase font-semibold whitespace-nowrap"

// Value
className="text-[#FFD700] font-bold text-sm flex items-center gap-1 shrink-0"
```

### CoverHonorBoard.tsx - StatRow Component

```tsx
// Dòng 73-86 - StatRow component
const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="flex items-center justify-between py-1 px-2 sm:px-2.5 rounded-lg 
    bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a]
    border-[2px] border-[#DAA520]
    shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_6px_rgba(218,165,32,0.3)]">
    <div className="flex items-center gap-1 sm:gap-1.5">
      <div className="text-[#E8D5A3] drop-shadow-[0_0_4px_rgba(218,165,32,0.5)]">
        {icon}
      </div>
      <span className="text-[#E8D5A3] font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wide">
        {label}
      </span>
    </div>
    <span className="text-[#FFD700] font-bold text-[11px] sm:text-xs md:text-sm drop-shadow-[0_0_4px_rgba(255,215,0,0.4)]">
      {formatNumber(value)}
    </span>
  </div>
);

// MobileStats grid items cũng cần cập nhật tương tự
className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] 
  rounded-lg py-1.5 px-1 border-[2px] border-[#DAA520]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_4px_rgba(218,165,32,0.3)]"
```

---

## Thứ tự thực hiện

1. **button.tsx** - Component gốc, ảnh hưởng toàn bộ app
2. **AppHonorBoard.tsx** - Stat items trong sidebar
3. **CoverHonorBoard.tsx** - Stats trong trang Profile

---

## Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Tất cả nút có nền **gradient glossy xanh lá** với ánh sáng bóng
- ✅ Viền **vàng kim loại 3D** sáng bóng sang trọng  
- ✅ Chữ/số màu **vàng nhạt kim loại** (#E8D5A3 cho labels, #FFD700 cho values)
- ✅ Hiệu ứng **glow vàng** nhẹ xung quanh
- ✅ Hover states có hiệu ứng sáng hơn và scale nhẹ
- ✅ Đồng nhất trên toàn bộ app (buttons, honor board, profile stats)
