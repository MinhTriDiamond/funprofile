

## Ẩn checklist điều kiện claim, chỉ hiện nhắc nhở khi claim

### Thay đổi
Ẩn khung "Điều kiện claim" (checklist xanh) khỏi giao diện Wallet. Khi người dùng nhấn nút Claim mà chưa đủ điều kiện, hiển thị toast thông báo cụ thể điều kiện nào chưa hoàn thành kèm hướng dẫn.

### Chi tiết kỹ thuật

**File: `src/components/wallet/ClaimRewardsSection.tsx`**

1. Xoá toàn bộ khối checklist "Điều kiện claim" (khung xanh với 5 điều kiện).

2. Cập nhật hàm `handleClaimClick`: khi `allConditionsMet === false`, thay vì chỉ disable nút, hiển thị toast warning liệt kê các điều kiện chưa đạt:
   - "Cập nhật họ tên đầy đủ" nếu chưa có
   - "Thêm ảnh đại diện" nếu chưa có
   - "Thêm ảnh bìa" nếu chưa có
   - "Đăng ít nhất 1 bài hôm nay" nếu chưa đăng
   - "Kết nối ví" nếu chưa kết nối

3. Nút Claim vẫn giữ nguyên logic disable khi chưa đủ điều kiện, nhưng thay vì `cursor-not-allowed` hoàn toàn, cho phép click để hiện toast nhắc nhở.

