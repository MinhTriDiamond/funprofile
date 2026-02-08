

# Kế Hoạch: Bổ Sung Safe-Area Cho Tết Background

## Phân Tích

Cấu hình hiện tại:
- **Desktop**: `top: 56px` → Đúng (h-14 = 56px)
- **Mobile**: `top: 48px` → Đúng (h-12 = 48px)
- **Header**: Đã có `safe-area-top` class

Vấn đề tiềm ẩn: Trên iPhone có tai thỏ (notch), header có thêm `env(safe-area-inset-top)`, nhưng TetBackground chưa tính vào phần safe-area này.

## Giải Pháp

Cập nhật CSS cho `.tet-background-container` để bao gồm safe-area-inset-top, đảm bảo video nền bắt đầu đúng vị trí trên tất cả thiết bị.

## Chi Tiết Kỹ Thuật

### File: `src/index.css`

**Thay đổi:**
```css
/* Trước */
.tet-background-container {
  top: 56px;
}

@media (max-width: 768px) {
  .tet-background-container {
    top: 48px;
  }
}

/* Sau - Thêm safe-area cho iPhone notch */
.tet-background-container {
  top: calc(56px + env(safe-area-inset-top, 0px));
}

@media (max-width: 768px) {
  .tet-background-container {
    top: calc(48px + env(safe-area-inset-top, 0px));
  }
}
```

## Tổng Kết

| File | Thay đổi |
|------|----------|
| `src/index.css` | Thêm `env(safe-area-inset-top)` vào `.tet-background-container` |

## Kết Quả Mong Đợi

- Hoa mai/đào và lồng đèn hiển thị đúng từ dưới header trên tất cả thiết bị
- Hoạt động chính xác trên iPhone có tai thỏ (notch)
- Không ảnh hưởng đến các thiết bị khác không có safe-area

