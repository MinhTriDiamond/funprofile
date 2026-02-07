
# 📦 Kế Hoạch Tích Hợp Facebook-Style Notification System

## 📋 Tổng Quan Package

Package này nâng cấp hệ thống thông báo hiện tại với nhiều tính năng mới theo phong cách Facebook:

| Tính năng mới | Mô tả |
|---------------|-------|
| Nhóm theo thời gian | Mới (1h), Hôm nay, Hôm qua, Tuần này, Trước đó |
| Snippet bài viết | Hiển thị 50 ký tự đầu nội dung bài viết |
| Lời mời kết bạn inline | Nút Xác nhận/Xóa ngay trong dropdown |
| Tab lọc Tất cả/Chưa đọc | Lọc nhanh thông báo |
| Thêm reaction types | care, pray (🙏), comment_reply |
| Expand/Collapse | Có thể mở rộng xem thêm thông báo |
| Settings menu | Dropdown menu với nhiều tùy chọn |

---

## 📁 Cấu Trúc Files Cần Tạo

```text
src/components/layout/notifications/   (MỚI)
├── types.ts                          - TypeScript interfaces
├── utils.ts                          - Utility functions
├── NotificationItem.tsx              - Component hiển thị 1 thông báo
├── FriendRequestItem.tsx             - Component lời mời kết bạn với nút action
├── NotificationSection.tsx           - Section nhóm thông báo theo thời gian
└── index.ts                          - Barrel export

src/components/layout/
└── NotificationDropdown.tsx          (CẬP NHẬT - thay thế hoàn toàn)

src/pages/
└── Notifications.tsx                 (GIỮ NGUYÊN - đã có sẵn)
```

---

## 📝 Chi Tiết Files Cần Tạo/Cập Nhật

### 1. types.ts (Mới)
- NotificationActor, NotificationPost interfaces
- NotificationGroups cho phân nhóm theo thời gian
- FilterTab type (all/unread)
- REACTION_ICONS constant với care, pray mới

### 2. utils.ts (Mới)
- groupNotificationsByTime() - Phân nhóm theo thời gian
- getNotificationIcon() - Icon cho từng loại thông báo
- truncateContent() - Cắt ngắn nội dung
- getNotificationText() - Văn bản thông báo với snippet

### 3. NotificationItem.tsx (Mới)
- Hiển thị 1 thông báo với avatar, icon, nội dung, thời gian
- Highlight thông báo chưa đọc
- Hiển thị snippet nội dung bài viết

### 4. FriendRequestItem.tsx (Mới)
- Hiển thị lời mời kết bạn
- Nút "Xác nhận" và "Xóa" inline
- Loading state khi xử lý

### 5. NotificationSection.tsx (Mới)
- Nhóm thông báo với tiêu đề (Mới, Hôm nay, etc.)
- Tùy chọn "Xem tất cả"

### 6. index.ts (Mới)
- Barrel export tất cả components

### 7. NotificationDropdown.tsx (Cập nhật hoàn toàn)
- Fetch thêm post content từ database
- Phân tách friend requests và other notifications
- Tab lọc All/Unread
- Expand/Collapse toggle
- Dropdown menu với settings
- Handle accept/reject friend request inline

---

## 🔄 So Sánh Trước/Sau

| Tính năng | Hiện tại | Sau khi tích hợp |
|-----------|----------|------------------|
| Nhóm thông báo | Không | Theo thời gian (5 nhóm) |
| Snippet bài viết | Không | Có (50 ký tự) |
| Friend request inline | Không | Có nút Xác nhận/Xóa |
| Tab lọc | Không | All/Unread |
| Expand | Không | Có toggle expand |
| Settings menu | Không | Có dropdown menu |
| care reaction | Không | Có (🥰) |
| pray reaction | Không | Có (🙏) |
| comment_reply type | Không | Có |

---

## ⏱️ Timeline

| # | Task | Thời gian |
|---|------|-----------|
| 1 | Tạo folder notifications/ | 1 phút |
| 2 | Tạo types.ts | 2 phút |
| 3 | Tạo utils.ts | 3 phút |
| 4 | Tạo NotificationItem.tsx | 3 phút |
| 5 | Tạo FriendRequestItem.tsx | 3 phút |
| 6 | Tạo NotificationSection.tsx | 2 phút |
| 7 | Tạo index.ts | 1 phút |
| 8 | Cập nhật NotificationDropdown.tsx | 5 phút |
| **Tổng** | | **~20 phút** |

---

## ✅ Kết Quả Mong Đợi

Sau khi tích hợp:
- Dropdown thông báo phong cách Facebook
- Phân nhóm thông báo theo thời gian rõ ràng
- Xem được snippet nội dung bài viết trong thông báo
- Xác nhận/từ chối lời mời kết bạn ngay trong dropdown
- Lọc nhanh thông báo chưa đọc
- Expand/collapse để xem thêm
- Hỗ trợ thêm các reaction mới (care, pray)

---

## 💡 Lưu Ý

- Dependencies đã có sẵn trong project (date-fns, lucide-react, sonner)
- Schema database notifications đã phù hợp
- Trang Notifications.tsx full-page giữ nguyên (đã có sẵn tính năng filter tốt)
- Query posts table cần join thêm để lấy content cho snippet
