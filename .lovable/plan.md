
# Kế hoạch: Hoàn thiện styling viền vàng kim loại + hình viên thuốc cho tất cả nút

## Tổng quan
Cập nhật tất cả các buttons còn lại trong ứng dụng để đảm bảo đồng nhất với design system mới: **hình viên thuốc (rounded-full)** và **viền vàng kim loại (#C9A84C)**.

---

## Files cần chỉnh sửa

### 1. FacebookNavbar.tsx - Desktop Navigation
**Vị trí:** `src/components/layout/FacebookNavbar.tsx` (dòng 128-143)

**Thay đổi:**
- Đổi `rounded-lg` thành `rounded-full`
- Thêm `border border-[#C9A84C]/40` cho trạng thái bình thường
- Thêm `hover:border-[#C9A84C]` cho hover state

---

### 2. MobileBottomNav.tsx - Bottom Navigation
**Vị trí:** `src/components/layout/MobileBottomNav.tsx` (dòng 77-83)

**Thay đổi:**
- Đổi `rounded-2xl` thành `rounded-full`
- Đổi `rounded-xl` (active state) thành `rounded-full`
- Thêm `border border-[#C9A84C]/40` cho trạng thái bình thường
- Thêm `border-[#C9A84C]` cho active state

---

### 3. Leaderboard.tsx - Category Tabs
**Vị trí:** `src/pages/Leaderboard.tsx` (dòng 139-152)

**Thay đổi:**
- Đổi `rounded-lg` thành `rounded-full`
- Thêm `border border-[#C9A84C]/40` cho trạng thái bình thường
- Thêm `border-[#C9A84C]` cho active state

---

### 4. Notifications.tsx - Filter Tabs
**Vị trí:** `src/pages/Notifications.tsx` (dòng 278-293)

**Thay đổi:**
- TabsTrigger đã có `rounded-full` nhưng cần thêm viền vàng
- Thêm `border border-[#C9A84C]/40`
- Thêm `data-[state=active]:border-[#C9A84C]`

---

### 5. Profile.tsx - Action Buttons và Tabs
**Vị trí:** `src/pages/Profile.tsx`

**Thay đổi cho Action Buttons (dòng 392-428):**
- Các Button đã dùng component chuẩn, nhưng cần kiểm tra variant
- Đảm bảo tất cả Button sử dụng variant phù hợp với viền vàng

**Thay đổi cho Tab Navigation (dòng 437-450):**
- TabsTrigger dùng `rounded-none` (thiết kế Facebook style với border-bottom)
- **Giữ nguyên** vì đây là tabs navigation, không phải buttons

---

### 6. Chat.tsx - Header Buttons
**Vị trí:** `src/pages/Chat.tsx`

**Thay đổi:**
- Các `Button variant="ghost"` cần thêm `border border-transparent hover:border-[#C9A84C]/40`
- DropdownMenuTrigger buttons cần styling tương tự

---

### 7. Auth.tsx - Guest Button
**Vị trí:** `src/pages/Auth.tsx` (dòng 150-158)

**Thay đổi:**
- Button "View as Guest" variant="outline" đã có styling từ button component
- **Không cần thay đổi** vì đã kế thừa từ `buttonVariants`

---

### 8. ChatInput.tsx - Send/Image Buttons
**Vị trí:** `src/components/chat/ChatInput.tsx`

**Thay đổi:**
- Icon buttons cần thêm viền vàng nhẹ
- Thêm `border border-[#C9A84C]/30 hover:border-[#C9A84C]/60`

---

## Chi tiết kỹ thuật

### FacebookNavbar.tsx
```tsx
// Dòng 128 - TRƯỚC
className={`flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-lg group ${...}`}

// SAU
className={`flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border group ${
  isActive(item.path)
    ? 'text-primary-foreground bg-primary border-[#C9A84C]'
    : 'text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-[#C9A84C]/50'
}`}
```

### MobileBottomNav.tsx
```tsx
// Dòng 77-83 - TRƯỚC
className={`flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-2xl transition-all duration-300 touch-manipulation group ${...}`}

// SAU
className={`flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-full transition-all duration-300 touch-manipulation group border ${
  item.isCenter
    ? 'relative -mt-8 border-transparent'
    : item.path && isActive(item.path)
    ? 'text-white bg-primary border-[#C9A84C]'
    : 'text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-[#C9A84C]/40 active:text-white active:bg-primary'
}`}
```

### Leaderboard.tsx
```tsx
// Dòng 143 - TRƯỚC
className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${...}`}

// SAU
className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-300 border ${
  activeCategory === cat.value 
    ? 'bg-primary text-white border-[#C9A84C]' 
    : 'hover:bg-gray-100 border-transparent hover:border-[#C9A84C]/40'
}`}
```

### Notifications.tsx
```tsx
// Dòng 283-285 - TRƯỚC
className={cn(
  "px-3 py-1.5 text-xs rounded-full whitespace-nowrap",
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
)}

// SAU
className={cn(
  "px-3 py-1.5 text-xs rounded-full whitespace-nowrap border transition-all duration-300",
  "border-transparent hover:border-[#C9A84C]/40",
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-[#C9A84C]"
)}
```

### ChatInput.tsx
```tsx
// Dòng 163-171 - Icon button thêm viền
className="flex-shrink-0 border border-[#C9A84C]/30 hover:border-[#C9A84C]/60 rounded-full"

// Dòng 186-196 - Send button giữ nguyên vì đã dùng component Button
```

---

## Thứ tự thực hiện

1. **MobileBottomNav.tsx** - Bottom nav quan trọng nhất trên mobile
2. **FacebookNavbar.tsx** - Desktop navigation
3. **Leaderboard.tsx** - Category tabs
4. **Notifications.tsx** - Filter tabs
5. **ChatInput.tsx** - Chat buttons
6. **Chat.tsx** - Chat header buttons

---

## Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Tất cả nút có hình **viên thuốc (rounded-full)**
- ✅ Tất cả nút có **viền vàng kim loại (#C9A84C)**
- ✅ Hover states hiển thị viền vàng sáng hơn
- ✅ Active states có viền vàng đậm nhất
- ✅ Đồng nhất trên cả Desktop và Mobile
