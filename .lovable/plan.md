
# Kế Hoạch: Đồng Nhất Khoảng Cách 3cm Cho Mobile

## Thay Đổi

Xóa bỏ media query đang giảm khoảng cách trên mobile từ 3cm xuống 1.5cm.

### File: `src/index.css`

**Trước:**
```css
.app-shell-content {
  top: calc(3cm + env(safe-area-inset-top, 0px));
}

@media (max-width: 640px) {
  .app-shell-content {
    top: calc(1.5cm + env(safe-area-inset-top, 0px));
  }
}
```

**Sau:**
```css
.app-shell-content {
  top: calc(3cm + env(safe-area-inset-top, 0px));
}

/* Bỏ media query giảm xuống 1.5cm - giữ 3cm cho cả mobile và desktop */
```

## Kết Quả

| Thiết Bị | Trước | Sau |
|----------|-------|-----|
| Desktop | 3cm | 3cm |
| Mobile | 1.5cm | **3cm** ✅ |

Điều này đảm bảo lồng đèn và hoa mai/hoa đào có đủ không gian hiển thị rõ ràng trên cả máy tính lẫn điện thoại.
