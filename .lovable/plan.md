

## Phân tích: Vì sao 15 user chưa đủ điều kiện vẫn tạo được lệnh rút thưởng

### Nguyên nhân gốc

**Cột `reward_status` có giá trị mặc định là `'pending'`.**

```sql
-- Migration 20251217184114
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reward_status text NOT NULL DEFAULT 'pending';
```

Khi bất kỳ user nào đăng ký tài khoản, `reward_status` tự động được gán = `'pending'`. Điều này có nghĩa **mọi user mới đều tự động xuất hiện trong hàng đợi duyệt thưởng** mà KHÔNG cần chủ động yêu cầu rút tiền.

### Vấn đề cụ thể

1. **Không có hành động "Yêu cầu rút"**: Hệ thống hiện tại KHÔNG có nút hay flow để user chủ động gửi yêu cầu rút thưởng. Trạng thái `pending` được gán tự động khi tạo tài khoản.
2. **15 user đó chưa bao giờ yêu cầu rút**: Họ chỉ đơn giản là user mới đăng ký, chưa đủ điều kiện (thiếu cover, ví, bài đăng...) nhưng vẫn hiện trong tab "Duyệt thưởng" vì `reward_status = 'pending'` là mặc định.
3. **Admin UI lọc theo `reward_status = 'pending'`** → hiển thị toàn bộ user mới, kể cả người chưa có ý định claim.

### Giải pháp đề xuất

Thay đổi giá trị mặc định từ `'pending'` → `'inactive'` và thêm flow yêu cầu rút:

#### 1. Database Migration
- Đổi default `reward_status` từ `'pending'` sang `'inactive'`
- Cập nhật 21 user hiện tại đang `pending` nhưng chưa đủ điều kiện → `'inactive'`
- Giữ nguyên user `pending` đã đủ điều kiện (nếu có)

#### 2. Thêm nút "Yêu cầu duyệt" trong ClaimRewardsSection
- Chỉ hiện khi `reward_status = 'inactive'` hoặc `'rejected'`
- Khi click: kiểm tra đủ 6 điều kiện cơ bản (tên, avatar, cover, bài hôm nay, ví, tuổi TK ≥ 7 ngày) → nếu đủ mới cho update `reward_status = 'pending'`
- Nếu thiếu điều kiện → hiện toast lỗi chi tiết

#### 3. Cập nhật Admin UI (RewardApprovalTab)
- Lọc bỏ user `'inactive'` khỏi danh sách
- Chỉ hiện user thực sự đã gửi yêu cầu (`pending`)

#### Tổng thay đổi
- **1 SQL migration**: đổi default + cleanup data
- **1 file sửa**: `ClaimRewardsSection.tsx` — thêm nút "Yêu cầu duyệt" + validation
- **1 file sửa**: `RewardApprovalTab.tsx` — cập nhật `statusConfig` thêm `inactive`

