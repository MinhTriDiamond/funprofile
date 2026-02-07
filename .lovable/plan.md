
# Kế Hoạch Hoàn Thiện: Tính Năng Thông Báo

## Vấn Đề 1: Chuông Thông Báo Nhấp Nháy

### Nguyên Nhân
Trong `NotificationDropdown.tsx`, có các class animation được kích hoạt khi `hasNewNotification = true`:

| Vị trí | Class Animation | Hiệu ứng |
|--------|----------------|----------|
| Button container (dòng 385, 464) | `animate-pulse` | Nhấp nháy opacity |
| Bell icon (dòng 392, 472) | `animate-bounce` | Nảy lên xuống |
| Badge số (dòng 398, 433, 477) | `animate-pulse scale-110` | Nhấp nháy + phóng to |

### Giải Pháp
Xóa tất cả animation classes, giữ icon cố định như Facebook:
- Xóa `animate-pulse` khỏi button container
- Xóa `animate-bounce` khỏi Bell icon
- Xóa `animate-pulse` khỏi badge số (giữ `scale-110` nếu muốn badge hơi lớn hơn khi có thông báo mới)

---

## Vấn Đề 2: Kiểm Tra Tính Năng Đã Hoạt Động

Sau khi sửa database FK, tính năng thông báo đã hoạt động:
- Query lấy thông báo có actor profile (avatar, username)
- Query lấy post snippet (nội dung bài viết)
- Realtime subscription đang active
- Phân nhóm theo thời gian hoạt động

---

## Files Cần Sửa

| File | Thay đổi |
|------|----------|
| `src/components/layout/NotificationDropdown.tsx` | Xóa animation classes từ 3 vị trí |

---

## Chi Tiết Code Changes

### NotificationDropdown.tsx

**Vị trí 1 - Mobile/Tablet Button (dòng 382-405):**
```text
Trước:
hasNewNotification && "animate-pulse"
...
hasNewNotification && "animate-bounce drop-shadow-..."
...
hasNewNotification ? "bg-gold ... animate-pulse scale-110"

Sau:
(xóa tất cả animation)
hasNewNotification && "drop-shadow-..."
hasNewNotification ? "bg-gold ..."
```

**Vị trí 2 - Desktop Center Nav Badge (dòng 430-437):**
```text
Trước:
hasNewNotification ? "bg-gold ... animate-pulse scale-110"

Sau:
hasNewNotification ? "bg-gold ..."
```

**Vị trí 3 - Desktop Default (dòng 458-484):**
```text
Trước:
hasNewNotification && "animate-pulse"
hasNewNotification && "animate-bounce"
hasNewNotification ? "bg-gold ... animate-pulse scale-110"

Sau:
(xóa tất cả animation)
```

---

## Kết Quả Mong Đợi

Sau khi sửa:
- Chuông thông báo cố định, không nhấp nháy/nảy
- Badge số hiển thị tĩnh (vẫn có màu gold nổi bật khi có thông báo mới)
- Giống phong cách Facebook: đơn giản, không gây phân tâm
- Tất cả tính năng thông báo hoạt động bình thường

---

## Timeline

| Task | Thời gian |
|------|-----------|
| Xóa animation classes | 2 phút |
| Testing | 2 phút |
| **Tổng** | **~4 phút** |
