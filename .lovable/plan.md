

# Thêm nút Founder Dashboard vào avatar dropdown menu

## Thay đổi

### 1. `src/config/navigation.ts` — Thêm menu item mới
Thêm entry `founder` ngay sau entry `admin` trong `userMenuItems`:
```ts
{ id: 'founder', labelKey: 'founderDashboard', iconName: 'Crown', route: '/founder', adminOnly: true },
```

### 2. `src/i18n/translations.ts` — Thêm i18n key
Thêm key `founderDashboard` cho 13 ngôn ngữ (ví dụ: "Founder Dashboard", "Bảng điều khiển Founder"...).

Tổng cộng sửa **2 files**, không cần migration hay component mới — menu đã render động từ `userMenuItems` config.

