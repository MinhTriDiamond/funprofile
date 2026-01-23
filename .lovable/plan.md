
# Kế hoạch: Làm viền mảnh hơn (1/3) và chuẩn hóa nút xanh theo mẫu

## Tổng quan thay đổi

Dựa trên hình mẫu con gửi, Cha sẽ:

1. **Giảm độ dày viền vàng** từ `border` (1px) xuống còn `border-[0.5px]` hoặc sử dụng kỹ thuật pseudo-element với `p-[1px]` thay vì `p-[3px]`
2. **Chuẩn hóa style nút xanh** theo mẫu: gradient xanh lá đẹp, viền vàng mảnh, bố cục icon + text trái, giá trị phải

---

## Phân tích hình mẫu

Từ hình con gửi, các nút xanh có:
- **Background**: Gradient xanh lá từ `#166534` đến `#22c55e` (từ đậm sang sáng)
- **Viền vàng**: Rất mảnh, khoảng 1px với màu vàng kim loại
- **Bố cục**: Icon + Label bên trái, Value bên phải
- **Bo góc**: Hoàn toàn tròn (rounded-full/pill shape)
- **Shadow**: Có ánh sáng nhẹ bên trong (inner glow)

---

## Files cần chỉnh sửa

### 1. `src/components/ui/button.tsx`
Giảm border từ `border` thành `border-[0.5px]`:

| Hiện tại | Thay đổi |
|----------|----------|
| `border border-[#C9A84C]/60` | `border-[0.5px] border-[#C9A84C]/60` |
| `border border-[#C9A84C]/40` | `border-[0.5px] border-[#C9A84C]/40` |
| `border border-[#C9A84C]` | `border-[0.5px] border-[#C9A84C]` |

---

### 2. `src/components/feed/AppHonorBoard.tsx`
Giảm viền diamond từ `p-[3px]` xuống `p-[1px]`:

```tsx
// Dòng 223 - TRƯỚC
before:p-[3px] ... after:inset-[3px]

// SAU  
before:p-[1px] ... after:inset-[1px]
```

---

### 3. `src/components/layout/FacebookNavbar.tsx`
Giảm border thành mảnh hơn:

```tsx
// Dòng 128 - TRƯỚC
border group ${...}'text-primary-foreground bg-primary border-[#C9A84C]'

// SAU
border-[0.5px] group ${...}'text-primary-foreground bg-primary border-[#C9A84C]'
```

---

### 4. `src/components/layout/MobileBottomNav.tsx`
Giảm border thành mảnh hơn:

```tsx
// Dòng 77 - TRƯỚC
border ${...}

// SAU
border-[0.5px] ${...}
```

---

### 5. `src/pages/Leaderboard.tsx`
Giảm border cho category tabs:

```tsx
// Dòng 143 - TRƯỚC
border ${...}

// SAU
border-[0.5px] ${...}
```

---

### 6. `src/pages/Notifications.tsx`
Giảm border cho filter tabs:

```tsx
// Dòng 284 - TRƯỚC
border transition-all...

// SAU
border-[0.5px] transition-all...
```

---

### 7. `src/components/chat/ConversationList.tsx`
Giảm border cho conversation items (nếu có)

---

### 8. `src/pages/Friends.tsx` & `src/components/friends/FriendsList.tsx`
Giảm border cho các nút trong trang bạn bè

---

### 9. `src/components/friends/FriendRequestButton.tsx` & `FriendCarousel.tsx`
Giảm border cho các nút Add Friend, Accept, Delete

---

## Chi tiết kỹ thuật

### button.tsx - Tất cả variants
```tsx
// TRƯỚC
default: "... border border-[#C9A84C]/60 ..."
destructive: "... border border-[#C9A84C]/40 ..."
outline: "... border border-[#C9A84C]/50 ..."
secondary: "... border border-[#C9A84C]/40 ..."
ghost: "... border border-transparent ..."
premium: "... border border-[#C9A84C] ..."
light: "... border border-[#C9A84C]/50 ..."

// SAU
default: "... border-[0.5px] border-[#C9A84C]/60 ..."
destructive: "... border-[0.5px] border-[#C9A84C]/40 ..."
outline: "... border-[0.5px] border-[#C9A84C]/50 ..."
secondary: "... border-[0.5px] border-[#C9A84C]/40 ..."
ghost: "... border-[0.5px] border-transparent ..."
premium: "... border-[0.5px] border-[#C9A84C] ..."
light: "... border-[0.5px] border-[#C9A84C]/50 ..."
```

### AppHonorBoard.tsx - Diamond border mảnh hơn
```tsx
// Dòng 223 và 251 - TRƯỚC
before:p-[3px] ... after:inset-[3px]

// SAU
before:p-[1px] ... after:inset-[1px]
```

---

## Thứ tự thực hiện

1. **button.tsx** - Component gốc, ảnh hưởng toàn bộ app
2. **AppHonorBoard.tsx** - Diamond border cho stat items
3. **FacebookNavbar.tsx** - Desktop navigation
4. **MobileBottomNav.tsx** - Mobile navigation  
5. **Leaderboard.tsx** - Category tabs
6. **Notifications.tsx** - Filter tabs
7. **Friends pages** - Nút trong trang bạn bè
8. **Chat components** - Nút trong chat

---

## Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Tất cả viền vàng mảnh đi 1/3 (từ 1px → ~0.5px)
- ✅ Diamond border trong Honor Board mảnh hơn (từ 3px → 1px)
- ✅ Các nút xanh có style đồng nhất với gradient đẹp
- ✅ Giữ nguyên bố cục icon + text trái, value phải
- ✅ Hiệu ứng hover và active vẫn hoạt động tốt
