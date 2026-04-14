

# Thêm nút Founder Dashboard vào Avatar Dropdown Menu

## Vấn đề
File `src/components/layout/FacebookNavbar.tsx` (dòng 349-358) hardcode nút "Admin Dashboard" trong avatar dropdown menu, nhưng **không có nút Founder Dashboard**. Mặc dù `userMenuItems` config đã có entry `founder`, dropdown không render từ config mà viết tay từng item.

## Giải pháp
Thêm nút **Founder Dashboard** ngay sau nút Admin Dashboard (dòng 358), cùng điều kiện `isAdmin`, dùng icon `Crown` và i18n key `founderDashboard`.

## Thay đổi

### File: `src/components/layout/FacebookNavbar.tsx`
Thêm sau block Admin Dashboard (dòng 358):
```tsx
{isAdmin && (
  <DropdownMenuItem 
    onClick={() => navigate('/founder')}
    className="cursor-pointer gap-2 text-amber-500 focus:text-amber-600"
  >
    <Crown className="w-4 h-4" />
    <span>{t('founderDashboard')}</span>
  </DropdownMenuItem>
)}
```

Cũng cần import `Crown` từ lucide-react (kiểm tra nếu chưa có).

### File: `src/components/feed/FacebookLeftSidebar.tsx`
Sidebar đã hardcode "Admin Dashboard" (dòng ~155) nhưng thiếu Founder Dashboard. Thêm tương tự ngay sau block admin.

**Tổng: sửa 2 files, thêm ~10 dòng code mỗi file.**

