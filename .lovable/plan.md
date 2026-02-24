
# Mở rộng tối đa khung bài đăng trên điện thoại

## Vấn đề hiện tại
Trên giao diện điện thoại (portrait), khung bài đăng `.fb-card` có `margin-left: 16px` và `margin-right: 16px`, khiến nội dung bài viết bị thu hẹp và chữ bị cắt ở bên phải (như ảnh con gửi).

## Giải pháp
Giảm margin của `.fb-card` trên mobile portrait từ **16px** xuống **4px** mỗi bên, giúp khung bài đăng chiếm gần hết chiều rộng màn hình, hiển thị rõ ràng và đẹp mắt hơn.

Tương tự, giảm margin trên mobile landscape từ **8px** xuống **4px**.

---

## Chi tiết kỹ thuật

### File: `src/index.css`

**Thay doi 1 - Mobile Portrait (dong 134-140):**
- `margin-left: 16px` -> `margin-left: 4px`
- `margin-right: 16px` -> `margin-right: 4px`

**Thay doi 2 - Mobile Landscape (dong 148-155):**
- `margin-left: 8px` -> `margin-left: 4px`
- `margin-right: 8px` -> `margin-right: 4px`

### Tong ket
- **1 file sua**: `src/index.css`
- Khung bai dang se rong hon ~24px tren mobile portrait, hien thi noi dung day du
