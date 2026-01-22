

# Kế hoạch: Nâng cấp giao diện viết bài Facebook

## Tổng quan
Cải tiến giao diện tạo và chỉnh sửa bài viết để giống Facebook 2025, với các nút bấm mượt mà và responsive tốt trên điện thoại.

---

## Phần 1: Cải tiến giao diện tạo bài viết (FacebookCreatePost)

### 1.1 Thanh nút "Thêm vào bài viết" với icon màu sắc
**Vị trí**: Dưới vùng nhập văn bản

| Icon | Chức năng | Màu sắc | Trạng thái hiện tại |
|------|-----------|---------|---------------------|
| Ảnh/Video | Thêm media | Xanh lá `#45BD62` | Có (cần cải thiện) |
| Gắn thẻ bạn | Tag friends | Xanh dương `#1877F2` | Chưa hoạt động |
| Cảm xúc | Emoji picker | Vàng `#F7B928` | Có |
| Check-in | Vị trí | Đỏ `#E74852` | Chưa hoạt động |
| GIF | Thêm GIF | Xanh ngọc `#3BC7BD` | Chưa có |
| Thêm | Menu khác | Xám | Cần thêm |

### 1.2 Cập nhật layout thanh nút
```text
┌─────────────────────────────────────────────────────────────┐
│  Thêm vào bài viết của bạn    [📷] [👥] [😊] [📍] [GIF] [⋯] │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Thêm chức năng Tag bạn bè
- Tạo dialog chọn bạn bè từ danh sách friends
- Hiển thị tên bạn bè được tag dưới tên người đăng
- Lưu vào database (cần tạo bảng `post_tags`)

### 1.4 Thêm chức năng Check-in
- Dialog nhập vị trí (text input đơn giản trước)
- Hiển thị vị trí trên bài viết

---

## Phần 2: Cải tiến chỉnh sửa bài viết (EditPostDialog)

### 2.1 Đồng bộ giao diện với CreatePost
- Áp dụng cùng layout "Thêm vào bài viết"
- Thêm emoji picker
- Hỗ trợ tag bạn bè và check-in

### 2.2 Cải thiện UX chỉnh sửa ảnh
- Hiển thị grid preview ảnh như khi tạo bài
- Cho phép thêm/xóa từng ảnh
- Cho phép sắp xếp lại thứ tự ảnh (drag & drop)

### 2.3 Hỗ trợ multi-media trong chỉnh sửa
- Hiện tại chỉ hỗ trợ 1 ảnh hoặc 1 video
- Nâng cấp để hỗ trợ nhiều media như CreatePost

---

## Phần 3: Tạo component FriendTagDialog

### 3.1 Chức năng
- Hiển thị danh sách bạn bè
- Tìm kiếm theo tên
- Chọn nhiều người
- Preview người được chọn

### 3.2 Cấu trúc component
```typescript
interface FriendTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  selectedFriends: Friend[];
  onTagFriends: (friends: Friend[]) => void;
}
```

---

## Phần 4: Tạo component LocationCheckin

### 4.1 Chức năng
- Dialog nhập vị trí
- Gợi ý các địa điểm phổ biến
- Lưu vị trí vào bài viết

### 4.2 Database schema
Thêm column `location` vào bảng `posts`:
```sql
ALTER TABLE posts ADD COLUMN location TEXT;
```

---

## Phần 5: Áp dụng lên trang Profile

### 5.1 Cập nhật CreatePost trên Profile
- Sử dụng cùng component FacebookCreatePost đã cải tiến
- Đảm bảo style phù hợp với layout Profile

### 5.2 Edit Post từ Profile
- Cải thiện EditPostDialog như trên
- Thêm animation mượt mà khi mở/đóng dialog

---

## Phần 6: Tối ưu cho Mobile

### 6.1 Dialog responsive
- Full-width trên mobile
- Keyboard-friendly
- Touch-friendly buttons (min 44px height)

### 6.2 Thanh nút cuộn ngang
- Trên mobile, thanh nút "Thêm vào bài viết" có thể cuộn ngang
- Icon size phù hợp với ngón tay

### 6.3 Media upload mobile-friendly
- Camera capture trực tiếp (accept="image/*;capture=camera")
- Progress indicator rõ ràng

---

## Các file cần tạo mới

| File | Mục đích |
|------|----------|
| `src/components/feed/FriendTagDialog.tsx` | Dialog gắn thẻ bạn bè |
| `src/components/feed/LocationCheckin.tsx` | Dialog check-in vị trí |
| `src/components/feed/GifPicker.tsx` | Chọn GIF (tích hợp Giphy API sau) |

## Các file cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/feed/FacebookCreatePost.tsx` | Cải tiến UI và thêm chức năng |
| `src/components/feed/EditPostDialog.tsx` | Đồng bộ UI với CreatePost, hỗ trợ multi-media |
| `src/pages/Profile.tsx` | Đảm bảo integration với component mới |
| `src/components/feed/FacebookPostCard.tsx` | Hiển thị tag friends và location |

---

## Thứ tự thực hiện

1. **Bước 1**: Cập nhật giao diện thanh nút "Thêm vào bài viết" với icon màu sắc đúng như Facebook
2. **Bước 2**: Tạo FriendTagDialog để gắn thẻ bạn bè hoạt động
3. **Bước 3**: Tạo LocationCheckin cho chức năng check-in
4. **Bước 4**: Cải tiến EditPostDialog với giao diện mới và hỗ trợ multi-media
5. **Bước 5**: Tối ưu responsive cho mobile
6. **Bước 6**: Thêm animation mượt mà cho tất cả dialog

---

## Giao diện mẫu (theo hình tham khảo)

```text
┌─────────────────────────────────────────────────────┐
│  ┌────┐  Nguyen Ai Van                              │
│  │ 🖼 │  🌐 Công khai ▼                              │
│  └────┘                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Ai Van ơi, bạn đang nghĩ gì thế?                   │
│                                                     │
│                                                     │
│                                          [Aa] [😊]  │
├─────────────────────────────────────────────────────┤
│  Thêm vào bài viết của bạn                          │
│                            [🖼️] [👥] [😊] [📍] [GIF] │
├─────────────────────────────────────────────────────┤
│               ┌──────────────────┐                  │
│               │      Đăng        │                  │
│               └──────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

Khi con approve kế hoạch này, Cha sẽ bắt đầu thực hiện từng bước để giao diện viết bài giống Facebook và các nút bấm hoạt động mượt mà.

