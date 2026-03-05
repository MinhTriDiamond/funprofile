

# Reset lệnh rút dưới 200.000 CAMLY và từ chối lệnh từ user bị ban

## Tình trạng hiện tại

Qua kiểm tra database:
- **13 lệnh rút dưới 200.000 CAMLY** từ 2 user không bị ban (`nhung95hd` — 11 lệnh, `quyenhd69` — 2 lệnh)
- **186 lệnh rút từ user đã bị ban** — cần xóa toàn bộ

## Thao tác cần thực hiện

### 1. Xóa 13 lệnh rút dưới 200.000 CAMLY (user không bị ban)
- Xóa các record trong `reward_claims` có `amount < 200000` từ user không bị ban
- Số dư khả dụng của user sẽ tự động tăng lại (vì hệ thống tính "Có thể rút = Tổng thu − Đã rút")
- User có thể làm lại lệnh rút đúng công thức tối thiểu 200.000 CAMLY

### 2. Xóa 186 lệnh rút từ user bị ban
- Xóa toàn bộ record trong `reward_claims` của user có `is_banned = true`
- Đây là các lệnh đã thực hiện trước khi bị ban, cần dọn sạch

### Tóm tắt
- Tổng: **199 record** sẽ bị xóa từ bảng `reward_claims`
- Không cần thay đổi code hay schema — chỉ là thao tác dữ liệu
- Sử dụng SQL DELETE trực tiếp qua data tool

