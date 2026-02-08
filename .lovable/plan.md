
# Kế Hoạch: Tối Ưu Hóa Giao Diện Mobile Fun Profile

## Tổng Quan Sau Khi Kiểm Tra

Sau khi kiểm tra kỹ giao diện trên mobile (390x844), Cha nhận thấy giao diện **đã khá ổn định** với nhiều điểm tốt:

### ✅ Các Điểm Tốt Đã Có
- **Feed page**: Hiển thị đầy đủ Stories, Posts với hình ảnh đẹp
- **Bottom Navigation**: 5 nút điều hướng rõ ràng, icon Honor Board nổi bật
- **Navbar**: Menu hamburger, logo, search, wallet icons hoạt động tốt
- **Angel AI Button**: Nút floating vàng gold hiển thị đúng vị trí
- **Auth page**: Form đăng nhập bóng kính đẹp, hoa đào hoa mai hiển thị rõ
- **Wallet page**: Thông báo đăng nhập hiển thị đúng khi chưa login
- **Cards**: Nền trong suốt (glass effect) cho thấy hoa mai/đào rõ nét

### 🔧 Các Vấn Đề Cần Cải Thiện

#### 1. Trang Leaderboard - Podium Top 3 Bị Lệch Trên Mobile
- Podium 3 cột (Top 1, 2, 3) hiển thị quá nhỏ và chật trên màn hình 390px
- Avatar và text bị co lại, khó đọc
- **Giải pháp**: Stack vertically hoặc hiển thị carousel trên mobile

#### 2. Padding Hai Bên Quá Lớn (2cm)
- `px-[2cm]` (~76px) chiếm quá nhiều không gian trên mobile 390px
- Nội dung bị thu hẹp còn ~238px
- **Giải pháp**: Responsive padding - `px-4 sm:px-6 lg:px-[2cm]`

#### 3. Category Tabs Trên Leaderboard
- Horizontal scroll tabs khó thấy hết các options trên mobile
- **Giải pháp**: Thêm fade indicator hoặc swipe hint

#### 4. Font Size Nhỏ Trên Một Số Elements
- Một số text trong cards quá nhỏ khó đọc
- **Giải pháp**: Tăng minimum font-size cho mobile

---

## Chi Tiết Các Thay Đổi

### 1. Feed.tsx - Responsive Padding
```text
Dòng 93: Thay px-[2cm] → px-4 sm:px-6 lg:px-[2cm]
Dòng 97: Thêm px-2 cho nội dung chính trên mobile
```

### 2. Leaderboard.tsx - Mobile-First Podium
```text
Dòng 121: Thay px-[2cm] → px-4 sm:px-6 lg:px-[2cm]
Dòng 159-223: Responsive podium grid
  - Mobile: Hiển thị dạng list thay vì 3 cột
  - Tablet+: Giữ nguyên grid 3 cột với top 1 ở giữa
```

### 3. Profile.tsx - Responsive Padding
```text
Dòng 356: Thay px-[2cm] → px-4 sm:px-6 lg:px-[2cm]
```

### 4. Wallet.tsx - Responsive Padding
```text
Dòng 48: Thay px-[2cm] → px-4 sm:px-6 lg:px-[2cm]
```

### 5. Friends.tsx - Responsive Padding
```text
Dòng 225: Thay px-[2cm] → px-4 sm:px-6 lg:px-[2cm]
```

### 6. Chat.tsx - Đã Tốt
- Không cần thay đổi, layout 2 column/single column đã responsive

### 7. index.css - Mobile Font Enhancement (Tùy Chọn)
```css
@media (max-width: 640px) {
  .fb-card p, .fb-card span {
    min-font-size: 12px;
  }
}
```

---

## Thay Đổi Chi Tiết Cho Leaderboard Podium

Hiện tại podium dùng `grid grid-cols-3` cho tất cả màn hình. Trên mobile 390px, mỗi cột chỉ còn ~100px - quá nhỏ.

**Giải pháp đề xuất:**

```text
Mobile (< 640px):
- Top 1: Card lớn nổi bật ở trên cùng
- Top 2, 3: 2 cột nhỏ hơn bên dưới
- Hoặc: Stack cả 3 thành list dọc

Tablet+ (≥ 640px):
- Giữ nguyên grid 3 cột với hiệu ứng podium (2-1-3)
```

---

## Tóm Tắt Files Cần Sửa

| File | Thay Đổi | Mức Độ |
|------|---------|--------|
| `src/pages/Feed.tsx` | Responsive padding | Nhẹ |
| `src/pages/Leaderboard.tsx` | Padding + Podium mobile | Trung bình |
| `src/pages/Profile.tsx` | Responsive padding | Nhẹ |
| `src/pages/Wallet.tsx` | Responsive padding | Nhẹ |
| `src/pages/Friends.tsx` | Responsive padding | Nhẹ |

---

## Kết Quả Mong Đợi

Sau khi áp dụng các thay đổi:
1. **Nội dung rộng hơn** trên mobile - không bị padding 2cm thu hẹp
2. **Podium Leaderboard** hiển thị đẹp hơn với layout phù hợp màn hình nhỏ
3. **Text dễ đọc hơn** với font size tối thiểu phù hợp
4. **Trải nghiệm nhất quán** từ mobile đến desktop

---

## Lưu Ý Kỹ Thuật

- Giữ nguyên layout `Fixed Scroll Shell` với `top-[3cm]`
- Giữ nguyên Glass UI transparency để hoa đào/mai hiển thị
- Không thay đổi bottom navigation (đã hoàn thiện)
- Responsive breakpoints: `sm:640px`, `md:768px`, `lg:1024px`
