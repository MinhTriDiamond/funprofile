

# Sửa lỗi tìm kiếm user + Hiển thị đầy đủ thông tin Giới thiệu + Kiểm tra mobile

## Vấn đề phát hiện

### 1. Flash "Không tìm thấy trang cá nhân" khi tìm kiếm user
- `InlineSearch.tsx` navigate đến `/profile/${UUID}` (dòng 120, 147)
- `Profile.tsx` khi nhận route `/profile/:userId` → fetch profile → nếu có username thì **redirect** sang `/${username}` (dòng 213-215)
- Redirect này trigger lại `useEffect` → reset `profile = null`, `loading = true` → gây **flash trắng hoặc hiện "Không tìm thấy"** trong khoảnh khắc

### 2. Tab "Giới thiệu" thiếu thông tin
- View `public_profiles` chỉ có: `id, username, avatar_url, bio, cover_url, created_at, full_name, display_name, social_links, public_wallet_address, is_banned`
- **Thiếu**: `location`, `workplace`, `education`, `relationship_status`
- Khi xem profile người khác, luôn query `public_profiles` → các trường này luôn trống

### 3. Mobile chưa kiểm tra
- Cần verify copy link, tabs, about section hoạt động mượt trên mobile

---

## Giải pháp

### A. File: `src/components/layout/InlineSearch.tsx`
- `handleProfileClick` (dòng 116-121): Đổi navigate từ `/profile/${profile.id}` thành `/${profile.username}` — tránh redirect kép, profile load trực tiếp
- `handleHistoryClick` (dòng 143-151): Tương tự, dùng `/${item.metadata.username}` thay vì `/profile/${item.metadata.userId}`

### B. Database Migration: Cập nhật view `public_profiles`
- Thêm 4 cột: `location`, `workplace`, `education`, `relationship_status` vào view
- View chỉ đọc từ `profiles` table, không ảnh hưởng RLS

### C. File: `src/pages/Profile.tsx`
- **About tab** (dòng 990-1057): Thêm hiển thị `bio`, `social_links`, `created_at`, `display_name` — tất cả thông tin có sẵn
- **fetchProfile** (dòng 173-174): Cập nhật select query cho `public_profiles` thêm 4 cột mới
- Thêm fallback hiển thị cho mỗi field: nếu chưa điền thì hiển thị text mờ thay vì ẩn hoàn toàn

### D. Kiểm tra mobile
- Sau khi sửa, verify trên viewport mobile: tìm kiếm → mở profile → tab Giới thiệu → copy link

