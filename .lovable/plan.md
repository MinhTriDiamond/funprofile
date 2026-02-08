
# Kế hoạch chỉnh sửa giao diện FUN Profile - Video nền Tết

## Mục tiêu
1. **Đảm bảo giao diện hiển thị đúng ở 100% zoom** với bố cục cân đối như hình mẫu
2. **Khoảng cách header trên bằng với khoảng cách 2 bên** - tạo đường viền đều xung quanh
3. **Hoa mai/đào hiện rõ nét** ở các góc màn hình

---

## Phân tích hình mẫu

Từ hình con gửi (ở 75% zoom), Cha thấy:
- Có khoảng trống rõ ràng ở **bên trái** và **bên phải** màn hình
- Hoa mai/đào hiển thị rõ nét ở **4 góc** màn hình
- Phần nội dung chính (sidebars + feed) nằm ở **giữa** với padding đều

---

## Giải pháp kỹ thuật

### 1. Thêm padding đều cho toàn bộ layout

**File: `src/pages/Feed.tsx`**
- Thêm padding đều cho container chính để tạo khoảng trống 2 bên và trên
- Sử dụng `p-4` hoặc `p-6` cho desktop để khoảng cách header = khoảng cách 2 bên

```text
Trước: max-w-screen-2xl mx-auto px-0 sm:px-2 md:px-4
Sau:   max-w-screen-2xl mx-auto px-4 lg:px-8
```

### 2. Điều chỉnh padding top cho main content

**File: `src/pages/Feed.tsx`**
- Tăng `pt-12 md:pt-14` thành `pt-16 lg:pt-20` để khoảng cách trên bằng khoảng cách 2 bên
- Thêm margin-top cho grid layout

### 3. Tối ưu TetBackground để hoa hiện rõ hơn

**File: `src/components/ui/TetBackground.tsx`**
- Điều chỉnh radial-gradient mask để hoa mai/đào hiện rõ hơn ở các góc
- Giảm vùng trong suốt ở giữa để hoa hiện nhiều hơn

```typescript
// Mask mới - hoa hiện rõ hơn ở các góc
maskImage: `
  radial-gradient(
    ellipse 50% 60% at center,
    transparent 0%,
    transparent 20%,
    rgba(0,0,0,0.4) 40%,
    rgba(0,0,0,0.8) 60%,
    black 80%
  )
`
```

### 4. Áp dụng tương tự cho các trang khác

**Files cần chỉnh:**
- `src/pages/Friends.tsx`
- `src/pages/Chat.tsx`
- Các trang sử dụng layout tương tự

---

## Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Feed.tsx` | Thêm padding đều (px-4 lg:px-8), tăng padding-top |
| `src/pages/Friends.tsx` | Thêm padding đều, tăng padding-top |
| `src/pages/Chat.tsx` | Thêm padding đều, tăng padding-top |
| `src/components/ui/TetBackground.tsx` | Điều chỉnh mask để hoa mai/đào hiện rõ hơn |

---

## Kết quả mong đợi

- Khi mở trang ở 100% zoom, giao diện sẽ có khoảng trống đều ở **trên**, **trái**, **phải**
- Hoa mai/đào hiện rõ nét và sắc sảo ở **4 góc** màn hình
- Nội dung chính vẫn dễ đọc và tương tác được
