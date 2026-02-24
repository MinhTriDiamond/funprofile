

# Fix: Nút "Add Friend" và "Message" không hiển thị trên hồ sơ người khác

## Nguyên nhân gốc

Trong file `Profile.tsx`, hàm `checkAuth` có lỗi logic **thiếu `return`** sau khi xử lý route `/:username`. Luồng thực thi:

1. Khi vào trang `/@NgocPhuong` (route `/:username`):
   - Dòng 90-100: Tìm username trong database -- đúng, `setIsOwnProfile(false)`
   - **NHƯNG** không có `return` -- code tiếp tục chạy xuống dưới!
   - Dòng 122: `profileId = userId` -- `userId` là `undefined` (vì dùng route `/:username`, không phải `/profile/:userId`)
   - Dòng 123-125: `if (!userId)` -- `true` -- `profileId = session.user.id` (ID của BẠN!)
   - Dòng 133: `setIsOwnProfile(true)` -- **ghi đè thành `true`**!
   - Dòng 134: `fetchProfile(session.user.id)` -- **tải lại hồ sơ CỦA BẠN**!

2. Kết quả: Trang hiển thị hồ sơ của BẠN với nút "Edit Profile" thay vì hồ sơ người khác với nút "Add Friend" + "Message".

## Giải pháp

### 1. Thêm `return` sau block username (sửa chính)
Thêm `return;` sau khi xử lý xong route `/:username` (dòng 120) để code không chạy tiếp xuống block `/profile/:userId`.

### 2. Sửa auth listener (cùng pattern fix trước)
Dòng 139-149: Áp dụng cùng logic lọc event đã sửa ở `FacebookNavbar` và `FacebookLeftSidebar` -- chỉ phản ứng với `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`.

### 3. Reset state khi chuyển profile
Thêm reset `isOwnProfile`, `profile`, `loading` ở đầu useEffect để tránh hiển thị dữ liệu cũ khi chuyển giữa các profile.

## Chi tiết kỹ thuật

```text
File: src/pages/Profile.tsx

Trước (lỗi):
  if (username) {
    // ... xử lý username lookup
    fetchProfile(profileData.id, session?.user.id);
  }                    // <-- THIẾU return, code chạy tiếp xuống!
  
  let profileId = userId;    // undefined cho /:username route
  if (!userId) {
    profileId = session.user.id;  // GHI ĐÈ bằng ID của bạn!
  }
  setIsOwnProfile(true);         // SAI!

Sau (sửa):
  if (username) {
    // ... xử lý username lookup
    fetchProfile(profileData.id, session?.user.id);
    return;            // <-- THÊM return, dừng tại đây
  }
  
  let profileId = userId;
  // ... chỉ chạy cho route /profile/:userId
```

### File cần sửa:
- `src/pages/Profile.tsx` -- 3 thay đổi: thêm return, sửa auth listener, reset state

