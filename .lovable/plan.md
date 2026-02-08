

# Kế Hoạch Hiển Thị Video Hoa Mai/Hoa Đào Tại Trang Cá Nhân

## Phân Tích Vấn Đề

Qua kiểm tra code, tôi phát hiện các vấn đề sau:

### 1. Trang Profile dùng nền đặc (solid background)
- **Dòng 334**: `<div className="min-h-screen bg-background overflow-hidden">`
- `bg-background` là màu nền đặc, che hoàn toàn video Tết

### 2. Các card trong Profile dùng nền đặc
- **Profile Info Section (dòng 391)**: `bg-card` - nền đặc
- **Intro Card (dòng 563)**: `bg-card` - nền đặc  
- **Photos Card (dòng 613)**: `bg-card` - nền đặc
- **Friends Card (dòng 642)**: `bg-card` - nền đặc
- **About, Photos, Videos, Edit tabs**: Tất cả dùng `bg-card` - nền đặc

### 3. So sánh với trang Feed
- Trang Feed: `<div className="min-h-screen overflow-hidden">` - KHÔNG có `bg-background`
- Video Tết hiển thị được trên trang Feed

---

## Giải Pháp

### Bước 1: Xóa nền đặc của trang Profile
Thay đổi container chính từ `bg-background` thành trong suốt để video Tết hiển thị.

### Bước 2: Áp dụng hiệu ứng bóng kính cho các card
Thay đổi tất cả `bg-card` thành `bg-card/70` hoặc `bg-card/80` để có hiệu ứng trong suốt, cho phép nhìn thấy hoa mai/hoa đào xuyên qua.

---

## Chi Tiết Thay Đổi

### File: `src/pages/Profile.tsx`

| Vị trí | Thay đổi |
|--------|----------|
| Dòng 334 | `bg-background` → (xóa bỏ) |
| Dòng 311 | `bg-[#f0f2f5]` → (xóa bỏ) - Loading state |
| Dòng 322 | `bg-[#f0f2f5]` → (xóa bỏ) - Not found state |
| Dòng 391 | Profile Info: `bg-card` → `bg-card/80` |
| Dòng 563 | Intro Card: `bg-card` → `bg-card/70` |
| Dòng 613 | Photos Card: `bg-card` → `bg-card/70` |
| Dòng 642 | Friends Card: `bg-card` → `bg-card/70` |
| Dòng 704 | Empty posts Card: `bg-card` → `bg-card/70` |
| Dòng 748 | About Tab: `bg-card` → `bg-card/70` |
| Dòng 772 | Friends Tab: `bg-card` → `bg-card/70` |
| Dòng 779 | Photos Tab: `bg-card` → `bg-card/70` |
| Dòng 798 | Videos Tab: `bg-card` → `bg-card/70` |
| Dòng 818 | Edit Tab: `bg-card` → `bg-card/70` |

---

## Kết Quả Mong Đợi

Sau khi hoàn thành:
- Video hoa mai/hoa đào hiển thị rõ nét phía sau trang cá nhân
- Các card có hiệu ứng bóng kính trong suốt
- Nội dung vẫn dễ đọc với độ mờ 70-80%
- Cánh hoa bay động thấy được xuyên qua các phần trong suốt

---

## Sơ Đồ Minh Họa

```text
╔═══════════════════════════════════════════════════════════════╗
║ 🏮 HOA ĐÀO       [Navbar 85%]              HOA MAI 🏮        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Cover Photo (ảnh bìa)                                   │  ║
║  │                                                         │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Profile Info (bg-card/80 - bóng kính)                   │  ║
║  │ Avatar | Name | Friends | Bio | Honor Board             │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌─────────────────┐  ┌───────────────────────────────────┐  ║
║  │ Intro Card      │  │ Posts                             │  ║
║  │ (bg-card/70)    │  │ (hoa xuyên qua)                   │  ║
║  │ 🌸 hoa hiện rõ  │  │                                   │  ║
║  ├─────────────────┤  │ ┌─────────────────────────────┐   │  ║
║  │ Photos Card     │  │ │ Post Card                   │   │  ║
║  │ (bg-card/70)    │  │ │ (bg-card/70)                │   │  ║
║  ├─────────────────┤  │ └─────────────────────────────┘   │  ║
║  │ Friends Card    │  │                                   │  ║
║  │ (bg-card/70)    │  │                                   │  ║
║  └─────────────────┘  └───────────────────────────────────┘  ║
║                                                               ║
║               🌸 cánh hoa bay động hiện rõ 🌸                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

