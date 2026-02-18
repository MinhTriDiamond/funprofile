
# Thêm Tab "Giám Sát & Truy Vết" vào Admin Dashboard

## Mục tiêu
Tạo một tab chuyên dụng trong Admin Dashboard để theo dõi tất cả tài khoản bị ban và nghi ngờ, với bảng dữ liệu đầy đủ gồm: số đã rút, số tồn đọng, ngày giờ hoạt động, và bằng chứng gian lận.

## Dữ liệu thực tế hiện có

Từ cơ sở dữ liệu, hệ thống đang theo dõi:
- **26 tài khoản đã bị ban** — tổng đã rút **29,570,000 CAMLY**
- **~20 tài khoản on_hold** — nghi ngờ qua tín hiệu SHARED_DEVICE (severity 3)
- Có đầy đủ lịch sử: ngày rút đầu tiên, ngày rút cuối, số lần rút, địa chỉ ví

## Các file cần tạo/chỉnh sửa

### 1. Tạo mới: `src/components/admin/SurveillanceTab.tsx`
Component tab mới với 2 phần:

**Phần A — Bảng tài khoản đã bị BAN:**

| Username | Họ tên | Đã rút (CAMLY) | Số lần rút | Lần rút đầu | Lần rút cuối | Ví | Lý do ban | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| luudung | luu thi dung | 2,000,000 | 4 | 14/02 14:22 | 17/02 05:21 | 0x5003... | IP TH | Farm ring |

**Phần B — Bảng tài khoản NGHI NGỜ (on_hold):**

| Username | Loại tín hiệu | Severity | Ngày phát hiện | Device Hash | Tài khoản liên quan | Hành động |
|---|---|---|---|---|---|---|
| minh_quan | SHARED_DEVICE | 3 | 17/02 15:03 | 01cdbbe6 | 5 tài khoản | [Ban] [Xem] |

### 2. Chỉnh sửa: `src/pages/Admin.tsx`
- Import `SurveillanceTab`
- Thêm tab trigger mới với icon `Eye` (Giám sát)
- Cập nhật grid từ 13 cột thành 14 cột

## Chi tiết kỹ thuật của SurveillanceTab

**Data fetching:**
```
Query 1 — Banned accounts:
  SELECT profiles + LEFT JOIN reward_claims aggregated
  WHERE is_banned = true OR reward_status = 'banned'
  ORDER BY total_claimed DESC

Query 2 — On-hold accounts:
  SELECT profiles + pplp_fraud_signals (latest per user)
  WHERE reward_status = 'on_hold' AND is_banned = false
  ORDER BY severity DESC, signal_date DESC
```

**UI Features:**
- 2 tab nội bộ: "Đã bị ban" và "Đang theo dõi (on_hold)"
- Summary cards ở đầu: Tổng bị ban / Tổng đã rút / Đang on_hold / CAMLY nguy cơ
- Export CSV button (danh sách ban + on_hold)
- Search/filter theo username
- Badge màu sắc: đỏ = banned, vàng = on_hold
- Cột "Lý do" rút gọn từ admin_notes (30 ký tự + tooltip đầy đủ)
- Địa chỉ ví rút gọn với link BSCScan
- Timestamp hiển thị theo múi giờ VN (UTC+7)

## Thứ tự thực hiện

1. Tạo `src/components/admin/SurveillanceTab.tsx` — component hoàn chỉnh
2. Chỉnh sửa `src/pages/Admin.tsx` — thêm import + tab trigger + tab content
