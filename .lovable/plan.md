

# Kế Hoạch Chuẩn Hóa Khoảng Cách Toàn Bộ Fun Profile

## Mục Tiêu
Đảm bảo tất cả các trang trong Fun Profile có:
- **Khoảng cách phía trên (top spacing)**: Cố định 3cm từ navbar
- **Khoảng cách trái/phải (side margins)**: Cố định 2cm (tương đương `px-[2cm]`)
- **Bố cục cố định (Fixed Scroll Shell)**: Navbar và khoảng cách trên không di chuyển khi cuộn

---

## Phân Tích Hiện Trạng

### Các Trang Đã Chuẩn Hóa Đúng (Fixed Scroll Shell + 3cm top)
| Trang | Top Spacing | Side Margins | Fixed Shell |
|-------|-------------|--------------|-------------|
| Feed.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Profile.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Chat.tsx | `top-[3cm]` | Không áp dụng (2-column) | Có |
| Friends.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Wallet.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Leaderboard.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Benefactors.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Notifications.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| About.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| Post.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |
| ConnectedApps.tsx | `top-[3cm]` | `px-4 sm:px-6 md:px-10` | Có |

### Các Trang Cần Cập Nhật
| Trang | Vấn Đề Hiện Tại | Cần Sửa |
|-------|-----------------|---------|
| Admin.tsx | Dùng `pt-[3cm]` + `p-4 sm:p-6 md:p-10` nhưng không có Fixed Shell | Thêm Fixed Shell, chuẩn hóa margins |
| Install.tsx | Không có Fixed Shell, không có spacing chuẩn | Thêm hoặc giữ nguyên (trang standalone) |
| Auth.tsx | Không có Fixed Shell (trang standalone) | Giữ nguyên |
| LawOfLight.tsx | Không có Fixed Shell (trang standalone) | Giữ nguyên |
| SetPassword.tsx | Không có Fixed Shell (trang standalone) | Giữ nguyên |
| NotFound.tsx | Không có Fixed Shell (trang standalone) | Giữ nguyên |
| AdminMigration.tsx | Thiếu Fixed Shell và spacing chuẩn | Thêm Fixed Shell + navbar |
| EcosystemDocs.tsx | Có sticky header riêng, không dùng FacebookNavbar | Cần đánh giá riêng |
| Các trang Docs khác | Tương tự EcosystemDocs | Giữ nguyên cấu trúc riêng |

---

## Kế Hoạch Thực Hiện

### Bước 1: Cập Nhật Admin.tsx
**Vấn đề**: Sử dụng padding trực tiếp thay vì Fixed Scroll Shell

**Thay đổi**:
```tsx
// Từ:
<div className="min-h-screen bg-[#f0f2f5] p-4 sm:p-6 md:p-10 pt-[3cm]">

// Thành:
<div className="min-h-screen bg-[#f0f2f5] overflow-hidden">
  <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
    <div className="max-w-7xl mx-auto px-[2cm] py-4">
```

### Bước 2: Cập Nhật AdminMigration.tsx  
**Vấn đề**: Thiếu FacebookNavbar và Fixed Scroll Shell

**Thay đổi**:
- Thêm `FacebookNavbar` component
- Thêm Fixed Scroll Shell layout
- Chuẩn hóa spacing

### Bước 3: Chuẩn Hóa Side Margins (px-[2cm])
Thay đổi từ `px-4 sm:px-6 md:px-10` thành `px-[2cm]` cho các trang:
- Feed.tsx
- Profile.tsx
- Friends.tsx
- Wallet.tsx
- Leaderboard.tsx
- Benefactors.tsx
- Notifications.tsx
- About.tsx
- Post.tsx
- ConnectedApps.tsx

### Bước 4: Các Trang Giữ Nguyên (Standalone Pages)
Các trang sau không cần Fixed Scroll Shell vì là trang standalone với thiết kế riêng:
- **Auth.tsx**: Trang đăng nhập với background riêng
- **LawOfLight.tsx**: Trang spiritual với background thiêng liêng
- **SetPassword.tsx**: Trang đặt mật khẩu đơn giản
- **NotFound.tsx**: Trang 404
- **Install.tsx**: Trang hướng dẫn cài đặt PWA
- **Docs pages**: Có header và layout riêng cho tài liệu

---

## Chi Tiết Kỹ Thuật

### Cấu Trúc Layout Chuẩn (Fixed Scroll Shell)
```tsx
<div className="min-h-screen overflow-hidden">
  <FacebookNavbar />
  
  <main 
    data-app-scroll 
    className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0"
  >
    <div className="max-w-7xl mx-auto px-[2cm] py-4">
      {/* Nội dung trang */}
    </div>
  </main>
  
  <MobileBottomNav />
</div>
```

### Giá Trị Spacing Chuẩn
| Thuộc Tính | Giá Trị | Mô Tả |
|------------|---------|-------|
| Top spacing | `top-[3cm]` | Khoảng cách cố định từ navbar |
| Side margins | `px-[2cm]` | Lề trái/phải 2cm |
| Bottom padding | `pb-20 lg:pb-0` | Padding cho mobile bottom nav |
| Max width | `max-w-7xl` | Giới hạn chiều rộng nội dung |

---

## Danh Sách Files Cần Chỉnh Sửa

1. **src/pages/Feed.tsx** - Cập nhật side margins thành `px-[2cm]`
2. **src/pages/Profile.tsx** - Cập nhật side margins thành `px-[2cm]`
3. **src/pages/Chat.tsx** - Giữ nguyên (layout 2 cột riêng)
4. **src/pages/Friends.tsx** - Cập nhật side margins thành `px-[2cm]`
5. **src/pages/Wallet.tsx** - Cập nhật side margins thành `px-[2cm]`
6. **src/pages/Leaderboard.tsx** - Cập nhật side margins thành `px-[2cm]`
7. **src/pages/Benefactors.tsx** - Cập nhật side margins thành `px-[2cm]`
8. **src/pages/Notifications.tsx** - Cập nhật side margins thành `px-[2cm]`
9. **src/pages/About.tsx** - Cập nhật side margins thành `px-[2cm]`
10. **src/pages/Post.tsx** - Cập nhật side margins thành `px-[2cm]`
11. **src/pages/ConnectedApps.tsx** - Cập nhật side margins thành `px-[2cm]`
12. **src/pages/Admin.tsx** - Thêm Fixed Shell + chuẩn hóa spacing
13. **src/pages/AdminMigration.tsx** - Thêm navbar + Fixed Shell + spacing

---

## Kết Quả Mong Đợi

Sau khi hoàn thành:
- Tất cả trang chính có khoảng cách **3cm từ navbar** cố định không cuộn
- Lề trái/phải đồng nhất **2cm** trên tất cả thiết bị  
- Video hoa mai hoa đào hiển thị rõ nét ở các góc màn hình
- Giao diện sang trọng, tươi mới, ngập tràn năng lượng Tết

