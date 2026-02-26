

# Xóa nền video Tết, ẩn nút Nhạc & nút Chọn hình nền

## Tóm tắt
Xóa toàn bộ video nền Tết (TetBackground), hiệu ứng Valentine glow (TetFlowerOverlay), nút chọn hình nền (TetBackgroundSelector), và nút nhạc (ValentineMusicButton) khỏi tất cả các trang. Nền sẽ trở về trắng mặc định.

## Các file cần sửa

| File | Thay đổi |
|------|----------|
| `src/App.tsx` | Xóa import và render `TetBackground`, `TetFlowerOverlay`, `TetBackgroundProvider` |
| `src/components/layout/FacebookNavbar.tsx` | Xóa import và tất cả render `TetBackgroundSelector`, `ValentineMusicButton` |
| `src/pages/Auth.tsx` | Xóa import và render `TetBackgroundSelector`, `ValentineMusicButton` |
| `src/pages/LawOfLight.tsx` | Xóa import và render `TetBackgroundSelector`, `ValentineMusicButton` |

## Chi tiết

### 1. `src/App.tsx`
- Xóa 3 import: `TetBackground`, `TetFlowerOverlay`, `TetBackgroundProvider`
- Xóa `<TetBackgroundProvider>` wrapper (giữ children)
- Xóa `<TetBackground />` và `<TetFlowerOverlay />`
- Nền sẽ trở về `bg-background` (trắng) từ CSS variables mặc định

### 2. `src/components/layout/FacebookNavbar.tsx`
- Xóa import `TetBackgroundSelector` và `ValentineMusicButton`
- Xóa 6 chỗ render: 2 cho mobile, 2 cho desktop logged-in, 2 cho desktop not-logged-in

### 3. `src/pages/Auth.tsx`
- Xóa import và render 2 nút trong `div.absolute.top-4.right-4`

### 4. `src/pages/LawOfLight.tsx`
- Xóa import và render 2 nút trong `div.fixed.top-4.right-4`

Sau khi sửa, nền sẽ là **trắng mặc định** (`hsl(45 30% 97%)` light theme), không còn video overlay hay glow effect nào.

