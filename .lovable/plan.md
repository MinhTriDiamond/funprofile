

## Kế hoạch: Thêm bảng điều kiện claim thưởng trong Fun Profile

### Mục tiêu
Thay thế phần "Profile Completion Reminders" hiện tại (chỉ hiện khi chưa đủ điều kiện) bằng một **bảng điều kiện luôn hiển thị**, liệt kê đầy đủ tất cả yêu cầu để claim — khớp với backend edge function `claim-reward`.

### Điều kiện hiện tại (từ backend)
1. ✅ Họ tên đầy đủ (≥ 4 ký tự, có chữ cái)
2. ✅ Ảnh đại diện (hình người thật)
3. ✅ Ảnh bìa trang cá nhân
4. ✅ Đăng ít nhất 1 bài hôm nay
5. ✅ Kết nối ví (địa chỉ hợp lệ 0x...)
6. ✅ Tài khoản ≥ 7 ngày
7. ✅ Admin đã duyệt (reward_status = approved)
8. ✅ Tối thiểu 200.000 CAMLY
9. ✅ Giới hạn 500.000 CAMLY/ngày

### Thay đổi

**File: `src/components/wallet/ClaimRewardsSection.tsx`**

1. **Thêm prop `accountAgeDays`** (number) — truyền từ parent để hiển thị điều kiện tuổi tài khoản ≥ 7 ngày.

2. **Thay thế phần "Profile Completion Reminders" (dòng 462-511)** bằng bảng điều kiện **luôn hiển thị**:
   - Card với header "Điều kiện Claim Thưởng" + icon ClipboardCheck
   - Danh sách dạng bảng 2 cột: Điều kiện | Trạng thái (✅/❌)
   - 9 điều kiện đầy đủ theo thứ tự trên
   - Đếm số điều kiện đã đạt / tổng (VD: "7/9 điều kiện")
   - Progress bar nhỏ hiển thị % hoàn thành
   - Nút "Cập nhật trang cá nhân" khi thiếu avatar/cover/tên
   - Khi đủ tất cả → hiện badge xanh "Sẵn sàng claim! 🎉"

3. **Cập nhật parent component** truyền `accountAgeDays` (tính từ `user.created_at`).

**File cần kiểm tra parent**: Tìm nơi render `ClaimRewardsSection` để thêm prop.

### Giao diện mẫu

```text
┌─────────────────────────────────────┐
│ 📋 Điều kiện Claim Thưởng  [7/9]   │
│ ████████████░░░░  78%               │
├─────────────────────────────────────┤
│ ✅ Họ tên đầy đủ (≥4 ký tự)        │
│ ✅ Ảnh đại diện                     │
│ ❌ Ảnh bìa trang cá nhân           │
│ ✅ Đăng bài hôm nay                │
│ ✅ Kết nối ví                       │
│ ✅ Tài khoản ≥ 7 ngày              │
│ ✅ Admin đã duyệt                  │
│ ❌ Tối thiểu 200.000 CAMLY         │
│ ✅ Chưa vượt 500.000/ngày          │
├─────────────────────────────────────┤
│ [  Cập nhật trang cá nhân  ]       │
└─────────────────────────────────────┘
```

Tổng: sửa **1–2 file** (ClaimRewardsSection + parent), không thay đổi backend.

