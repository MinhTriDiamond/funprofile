

## Kế Hoạch Cập Nhật Mobile Bottom Navbar

### Yêu Cầu
1. **Thêm nền trắng** cho navbar trên mobile và tablet
2. **Thay icon Honor Board** (chính giữa) bằng ảnh huy chương xanh lá

### Thay Đổi Cụ Thể

#### 1. Thêm Nền Trắng Cho Navbar

**File: `src/components/layout/MobileBottomNav.tsx`**

| Trước | Sau |
|-------|-----|
| `bg-transparent` | `bg-white dark:bg-gray-900` |

```text
Dòng 74:
TRƯỚC:
  className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-transparent border-t border-border/30 ..."

SAU:
  className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-900 border-t border-border/30 ..."
```

#### 2. Thay Icon Honor Board Bằng Ảnh

**Bước 1:** Copy ảnh vào thư mục `src/assets`
- File: `user-uploads://Honor_board.png` → `src/assets/honor-board-icon.png`

**Bước 2:** Import và sử dụng ảnh thay cho icon Award

```typescript
// Thêm import
import honorBoardIcon from '@/assets/honor-board-icon.png';

// Thay đổi phần render center button (dòng 89-101)
// TRƯỚC: Sử dụng <item.icon /> (Award icon từ lucide)
// SAU: Sử dụng <img src={honorBoardIcon} />
```

```text
Dòng 89-101 (Center Button):
TRƯỚC:
  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 ...">
    <item.icon className="w-6 h-6 text-white drop-shadow-md" strokeWidth={2.5} />
  </div>

SAU:
  <div className="relative w-14 h-14 flex items-center justify-center">
    <img 
      src={honorBoardIcon} 
      alt="Honor Board" 
      className="w-14 h-14 object-contain drop-shadow-lg"
    />
  </div>
```

### Kết Quả Mong Đợi

| Thành phần | Trước | Sau |
|------------|-------|-----|
| Navbar background | Trong suốt | Nền trắng (sáng) / Xám đen (tối) |
| Honor Board button | Icon Award với gradient vàng cam | Ảnh huy chương xanh lá đẹp mắt |
| Glow effects | Hiện có | Giữ nguyên hoặc điều chỉnh cho phù hợp với ảnh mới |

### Chi Tiết Kỹ Thuật

- Ảnh Honor Board sẽ được import qua ES6 module (`import ... from '@/assets/...'`) để tối ưu bundling
- Nền trắng hỗ trợ cả light mode (`bg-white`) và dark mode (`dark:bg-gray-900`)
- Ảnh huy chương có kích thước phù hợp với không gian navbar (w-14 h-14)

