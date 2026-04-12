

## Kế hoạch: Tự động quay về trang cá nhân sau khi cập nhật hồ sơ

### Vấn đề
Sau khi user bấm "Cập nhật hồ sơ", hệ thống vẫn giữ nguyên tab "Chỉnh sửa" thay vì quay về hiển thị trang cá nhân.

### Thay đổi

**File 1: `src/pages/Profile.tsx`**
- Truyền thêm 2 props cho `EditProfile`:
  - `onSaved` callback → gọi `setActiveTab('posts')` + `handleRefresh()` để quay về tab bài viết và tải lại dữ liệu mới
  - `scrollToTabs` → cuộn lên đầu trang cá nhân

**File 2: `src/components/profile/EditProfile.tsx`**
- Nhận props `onSaved?: () => void`
- Sau khi cập nhật thành công (dòng 343, sau `toast.success`), gọi `onSaved?.()` để tự động chuyển về tab "Bài viết"

### Kết quả
Trên cả điện thoại và máy tính, sau khi bấm "Cập nhật hồ sơ" thành công, hệ thống tự động quay về hiển thị trang cá nhân với dữ liệu đã được cập nhật.

