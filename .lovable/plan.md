
# Tab "Social Links" trong Admin Dashboard

## Mục tiêu
Thêm tab mới trong trang Admin để hiển thị danh sách tất cả user đã liên kết mạng xã hội, giúp admin theo dõi, kiểm tra tính hợp lệ và phát hiện link giả/spam.

## Dữ liệu hiện tại
- 42/571 user đã liên kết (7.4%)
- Tổng 199 link mạng xã hội
- Dữ liệu lưu trong cột `social_links` (JSONB) của bảng `profiles`

## Giao diện tab mới

### 1. Thẻ tóm tắt (Summary Cards)
- Tổng user đã liên kết / tổng user
- Tổng số link
- Thống kê theo từng platform (Angel, FunPlay, Facebook, YouTube, Twitter, Telegram, TikTok, LinkedIn, Zalo)

### 2. Bảng danh sách chi tiết
Các cột hiển thị:
- Avatar + Username
- Họ tên
- Số link đã liên kết
- Danh sách platform (hiển thị icon)
- Ngày tạo tài khoản
- Trạng thái (banned/active)

Tính năng:
- Tim kiem theo username
- Loc theo platform cu the (vd: chi xem user co Facebook)
- Xem chi tiet link khi bam vao hang (expand row)
- Xuat CSV

### 3. Chi tiet khi expand
- Platform, Label, URL (clickable), Avatar (neu co)

## Thay doi ky thuat

### File moi
- `src/components/admin/SocialLinksTab.tsx` -- Component tab moi

### File can sua
- `src/pages/Admin.tsx` -- Them tab "Social Links" vao TabsList va TabsContent

### Khong can thay doi database
- Du lieu da co san trong cot `social_links` cua bang `profiles`
- Truy van truc tiep bang Supabase client, khong can RPC moi

### Pattern su dung
- Theo pattern cua `SurveillanceTab.tsx`: su dung Table, Card, Badge, Input search, export CSV
- Su dung PLATFORM_PRESETS tu `SocialLinksEditor.tsx` de hien thi icon va mau sac dung chuan
