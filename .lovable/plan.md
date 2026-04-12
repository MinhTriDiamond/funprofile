

## Kế hoạch: Sửa lỗi tab "Chỉnh sửa" không hoạt động

### Nguyên nhân gốc

Trong `src/hooks/useProfile.ts` dòng 68:
```ts
const [activeTab, setActiveTab] = usePersistedTab('profile-tab', 'posts', ['posts', 'about', 'friends', 'photos'] as const);
```

Danh sách tab hợp lệ thiếu **'edit'**, **'videos'**, và **'honorboard'**. Khi user bấm "Chỉnh sửa trang cá nhân", hệ thống set `activeTab = 'edit'`, nhưng hook `usePersistedTab` kiểm tra thấy 'edit' không nằm trong danh sách hợp lệ → **tự động reset về 'posts'**. Vì vậy form chỉnh sửa không bao giờ hiển thị được.

### Thay đổi

**File: `src/hooks/useProfile.ts`** (1 dòng duy nhất)

Thêm `'edit'`, `'videos'`, `'honorboard'` vào danh sách tab hợp lệ:
```ts
const [activeTab, setActiveTab] = usePersistedTab('profile-tab', 'posts', ['posts', 'about', 'friends', 'photos', 'videos', 'honorboard', 'edit'] as const);
```

### Kết quả
- Bấm "Chỉnh sửa trang cá nhân" sẽ chuyển sang tab edit và hiển thị form chỉnh sửa đúng trên cả mobile và desktop.
- Các tab "Videos" và "Honor Board" cũng sẽ hoạt động đúng.

