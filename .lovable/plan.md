
# Kế Hoạch: Hiển Thị Hoa Mai/Đào & Lồng Đèn Rõ Ràng Trên Mobile

## Phân Tích Vấn Đề Gốc

Qua việc kiểm tra trực tiếp trên mobile viewport (390x844), Cha xác nhận:
- **Video đang chạy** nhưng hoa mai/đào KHÔNG hiển thị
- `visibleFlowers: null` và `visibleLanterns: null` - không có hoa hay lồng đèn nào visible

### Nguyên Nhân Đã Xác Định

| Vấn đề | Mô tả | Ảnh hưởng |
|--------|-------|-----------|
| **Video Scale 1.15** | `transform: scale(1.15)` phóng to video 15% | Hoa ở góc bị đẩy ra ngoài viewport, không nhìn thấy |
| **Object Position Center** | `object-position: center center` | Video focus vào phần giữa, hoa ở góc bị crop |
| **Top-[3cm] Gap** | Navbar 48px nhưng content bắt đầu từ 113px (3cm) | Khoảng giữa 65px trống nhưng có thể lồng đèn không nằm đúng vị trí này |
| **Container Padding** | `px-4` trên Feed.tsx = 16px padding | Kết hợp với margin 16px = cards vẫn chiếm phần lớn width |

## Giải Pháp Đề Xuất

### 1. Điều Chỉnh Video Transform Trên Mobile

Thay vì `scale(1.15)` làm hoa bị crop, cần:
- Giảm scale hoặc bỏ scale
- Đổi `object-position` để hoa ở góc hiển thị

```css
@media (max-width: 768px) {
  .tet-video {
    top: 0 !important;
    /* Đổi từ center center → top center để lồng đèn/hoa ở trên hiển thị */
    object-position: top center !important;
    /* Bỏ scale hoặc giảm xuống 1.05 */
    transform: translateX(-50%) scale(1.0) !important;
    filter: saturate(1.25) contrast(1.12) brightness(1.05) !important;
  }
}
```

### 2. Giảm Top Margin Trên Mobile

Main content có `top-[3cm]` (113px) quá lớn cho mobile. Cần responsive:

```tsx
// Feed.tsx
<main className="fixed inset-x-0 top-[1.5cm] sm:top-[3cm] bottom-0 overflow-y-auto...">
```

Điều này giảm khoảng cách từ 113px xuống ~57px trên mobile, để lại không gian phía trên cho lồng đèn nhưng không quá lớn.

### 3. Bỏ Container Padding Trên Mobile

Để tối đa không gian cho hoa mai/đào ở 2 bên:

```tsx
// Feed.tsx - Container padding
<div className="max-w-screen-2xl mx-auto px-0 sm:px-6 lg:px-[2cm]">
```

Card margin 16px sẽ tạo gap đủ rộng cho hoa hiển thị.

### 4. Cập Nhật TetBackground với Mobile-First Approach

```tsx
// TetBackground.tsx
<video
  className="tet-video absolute top-0 left-1/2 w-auto h-auto min-w-full min-h-full object-cover md:top-12"
  style={{
    transform: 'translateX(-50%)',
    objectPosition: 'top center',
    // Mobile: không scale để hoa góc không bị crop
    // Desktop: giữ nguyên
  }}
/>
```

## Tóm Tắt Các File Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/index.css` | Bỏ `scale(1.15)` và đổi `object-position` cho mobile |
| `src/pages/Feed.tsx` | Responsive top margin: `top-[1.5cm] sm:top-[3cm]` và bỏ `px-4` trên mobile |
| `src/components/ui/TetBackground.tsx` | Cập nhật inline styles cho mobile-first |
| (Các trang khác nếu dùng layout tương tự) | Apply cùng cách tiếp cận |

## Kết Quả Mong Đợi

Sau khi sửa:
1. **Hoa mai/đào** hiển thị rõ ở 2 góc trên và 2 bên của màn hình mobile
2. **Lồng đèn** hiển thị ở phần trên (giữa video) không bị content che
3. **Cards** có margin 16px mỗi bên, đủ không gian để thấy hoa
4. **Giao diện đồng nhất** giữa mobile và desktop - đều thấy rõ hoa mai/đào

## Chi Tiết Kỹ Thuật

### Object Position:
- `top center`: Ưu tiên hiển thị phần trên của video (lồng đèn)
- `center center`: Hiển thị phần giữa (có thể không có hoa ở góc)

### Scale Factor:
- `scale(1.0)`: Không phóng to - giữ nguyên tỷ lệ gốc
- `scale(1.15)`: Phóng to 15% - góc bị crop ~7.5% mỗi bên

### Top Offset Calculation:
- Mobile: 1.5cm ≈ 57px (navbar 48px + 9px gap)
- Desktop: 3cm ≈ 113px (navbar 56px + 57px gap cho lồng đèn)
