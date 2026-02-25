

# Sửa lỗi: Click tên người dùng trong dialog Cảm xúc → "Không tìm thấy trang cá nhân"

## Nguyên nhân

Có **2 vấn đề** trong `ReactionViewerDialog.tsx`:

### 1. Sai đường dẫn điều hướng
Hàm `handleUserClick` điều hướng đến `/profile/${username}`, nhưng hệ thống route sử dụng `/:username` (không có prefix `/profile/`). Kết quả: URL `/profile/username` không khớp route nào → hiển thị trang NotFound.

### 2. Query join sai bảng
Query hiện tại join `reactions` với bảng `profiles` trực tiếp (`profiles:user_id`). Bảng `profiles` có RLS policies hạn chế SELECT, nên kết quả join có thể trả về null cho `item.profiles`. Khi đó username fallback thành `'Unknown'` → điều hướng đến `/Unknown` → không tìm thấy.

Hệ thống đã có view `public_profiles` (public, không bị RLS chặn) chứa đầy đủ thông tin cần thiết.

## Giải pháp

| File | Thay đổi |
|------|----------|
| `src/components/feed/ReactionViewerDialog.tsx` | (1) Đổi navigation từ `/profile/${username}` thành `/${username}`. (2) Đổi query join từ `profiles:user_id` sang `public_profiles:user_id` để tránh bị RLS chặn. |

## Chi tiết kỹ thuật

**Dòng 66**: Đổi `profiles:user_id` → `public_profiles:user_id`

**Dòng 102**: Đổi `navigate('/profile/${username}')` → `navigate('/${username}')`

