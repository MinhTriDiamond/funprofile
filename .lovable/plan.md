

## Kế hoạch triển khai

### 1. Sửa đếm phương thức: 3 → 4

**`src/hooks/useLoginMethods.ts`**: Thêm constant `TOTAL_METHODS = 4`. Export nó để UI dùng.

**`src/pages/SecuritySettings.tsx`**:
- Dòng 93: `securityProgress` chia cho 4 thay vì 3
- Dòng 203: Hiển thị `{activeMethodCount}/4` thay vì `/3`

**`src/hooks/useLoginMethods.ts`**: `isFullySecured` thêm check `hasGoogleIdentity`:
```
hasEmailLoginMethod && hasPassword && hasWalletLoginMethod && hasGoogleIdentity
```

---

### 2. Tạo trang Settings tổng với sidebar tabs

**Tạo `src/pages/Settings.tsx`**: Layout gồm sidebar trái + content area.
- Sidebar dùng danh sách tab đơn giản (không cần Shadcn Sidebar component, vì đây là settings page nhỏ gọn)
- Tabs đề xuất:
  - **Bảo mật** (Shield icon) — nội dung hiện tại của SecuritySettings
  - **Tài khoản** (User icon) — placeholder "Sắp ra mắt"
  - **Thông báo** (Bell icon) — placeholder
  - **Hiển thị** (Monitor icon) — placeholder
- URL: `/settings` (default tab = security), `/settings/security`, `/settings/account`, etc.
- Mobile: tabs hiển thị ngang scrollable hoặc dropdown

**Refactor `SecuritySettings.tsx`**: Tách nội dung bảo mật thành component `SecuritySettingsContent.tsx` (không có Navbar/layout wrapper). Settings page sẽ wrap nó.

**Cập nhật `src/App.tsx`**:
- Route `/settings` → Settings page
- Route `/settings/:tab` → Settings page với tab động
- Giữ `/settings/security` tương thích

---

### 3. Thêm nút Settings vào avatar dropdown

**`src/components/layout/FacebookNavbar.tsx`**: Thêm `DropdownMenuItem` "Cài đặt" (Settings icon) vào dropdown menu, giữa Admin Dashboard và Logout, navigate tới `/settings`.

---

### Tổng kết files

| File | Thay đổi |
|---|---|
| `src/pages/Settings.tsx` | Tạo mới — layout settings với sidebar tabs |
| `src/components/settings/SecuritySettingsContent.tsx` | Tạo mới — tách nội dung từ SecuritySettings |
| `src/pages/SecuritySettings.tsx` | Redirect sang `/settings/security` hoặc xóa |
| `src/hooks/useLoginMethods.ts` | Sửa TOTAL_METHODS=4, isFullySecured thêm Google |
| `src/components/layout/FacebookNavbar.tsx` | Thêm menu item "Cài đặt" |
| `src/App.tsx` | Thêm route `/settings/:tab?` |

