

# Fix: Trang hồ sơ người khác hiển thị sai thành hồ sơ của mình

## Nguyên nhân

Có **2 vấn đề** còn tồn tại trong `Profile.tsx`:

### 1. Lookup username phân biệt HOA/thường (chính)
Query tìm user theo username dùng `.eq('username', cleanUsername)` -- phân biệt hoa/thường. Nếu URL là `/@thuthuy_86` nhưng DB lưu `ThuThuy_86`, query fail, `profileData = null`, code vào nhánh else, set `profile = null` -- hiển thị "Profile not found" hoặc rơi vào trạng thái không mong muốn.

Cần đổi sang dùng `username_normalized` (đã lowercase sẵn trong DB) -- giống pattern của `InlineSearch`, `EditProfile`, `NewConversationDialog`.

### 2. `handlePostDeleted` re-fetch sai profile
Hàm `handlePostDeleted` dùng `userId || currentUserId`. Với route `/:username`, `userId` là `undefined` nên fallback về `currentUserId` (ID người đang đăng nhập) -- gọi `fetchProfile` với ID sai, ghi đè toàn bộ dữ liệu profile thành của mình.

Tương tự, `handlePullRefresh` dùng `profile?.id || userId || currentUserId` -- nếu `profile` chưa load xong thì cũng fallback về `currentUserId`.

## Giải pháp

### File: `src/pages/Profile.tsx`

**Sửa 1: Dùng `username_normalized` cho lookup (dòng 97-101)**
```
Trước:
  .from('public_profiles')
  .select('id')
  .eq('username', cleanUsername)
  .single();

Sau:
  .from('public_profiles')
  .select('id')
  .eq('username_normalized', cleanUsername.toLowerCase())
  .single();
```

**Sửa 2: Fix `handlePostDeleted` (dòng 301-306)**
```
Trước:
  const profileId = userId || currentUserId;

Sau:
  const profileId = profile?.id || userId || currentUserId;
```
Dùng `profile?.id` trước để giữ đúng profile đang xem.

**Sửa 3: Thêm guard cho `handlePullRefresh` (dòng 308-313)**
Đã dùng `profile?.id` nhưng cần đảm bảo `fetchProfile` giữ đúng `isOwnProfile` state:
```
Trước:
  await fetchProfile(profileId, currentUserId);

Sau:
  await fetchProfile(profileId, currentUserId);
  // isOwnProfile giữ nguyên vì fetchProfile không thay đổi nó
```
(Không cần thay đổi logic, chỉ cần xác nhận `fetchProfile` KHÔNG gọi `setIsOwnProfile`)

### Tổng kết: 2 thay đổi code trong 1 file
- Dòng 100: `.eq('username', cleanUsername)` -> `.eq('username_normalized', cleanUsername.toLowerCase())`
- Dòng 302: `userId || currentUserId` -> `profile?.id || userId || currentUserId`
