

# Nâng Cấp Hệ Thống Duyệt Thưởng - Xác Minh Profile Đầy Đủ

## Vấn Đề Hiện Tại

Hiện tại, tab "Duyệt thưởng" cho phép admin duyệt cho bất kỳ user nào mà **không kiểm tra** profile có đầy đủ hay không. Dữ liệu thực tế:

| Tiêu chí | Số lượng | Tỷ lệ |
|----------|----------|--------|
| Tổng user (chưa bị cấm) | 393 | 100% |
| Có avatar | 376 | 96% |
| Có ảnh bìa | 125 | 32% |
| Có tên đầy đủ | 107 | 27% |
| Có ví công khai | 35 | 9% |
| **Đầy đủ (avatar + tên + ví)** | **30** | **8%** |

Nhiều user có reward lớn nhưng chưa thiết lập ví hoặc chưa có tên thật.

## Giải Pháp

### 1. Thêm trạng thái "Profile Readiness" vào RewardApprovalTab

Mỗi user trong danh sách duyệt thưởng sẽ hiển thị **badge xác minh** cho từng tiêu chí:
- Avatar thật (co avatar_url)
- Tên đầy đủ (full_name khong trong)
- Ví công khai (public_wallet_address)

### 2. Phân loại user: "Sẵn sàng" vs "Chưa đủ điều kiện"

- **Sẵn sàng (xanh)**: Có avatar + tên đầy đủ + ví cong khai -- cho phep duyet
- **Chưa đủ (vàng)**: Thiếu 1 hoặc nhiều tiêu chí -- nút duyệt bị vô hiệu hóa, hiển thị lý do

### 3. Thêm bộ lọc nhanh

Thêm các filter button ở đầu danh sách:
- "Tất cả" -- hiển thị tất cả
- "Sẵn sàng duyệt" -- chỉ user đủ điều kiện
- "Chưa đủ điều kiện" -- user cần hoàn thiện profile

### 4. Fetch thêm dữ liệu profile

Hiện tại `RewardApprovalTab` chỉ lấy dữ liệu từ `get_user_rewards_v2` (chỉ có username, avatar_url). Cần fetch thêm `full_name`, `public_wallet_address`, `cover_url` từ bảng `profiles` để kiểm tra.

## Chi Tiết Kỹ Thuật

### File cần sửa: `src/components/admin/RewardApprovalTab.tsx`

1. **Mở rộng interface `UserWithReward`**: Thêm `full_name`, `public_wallet_address`, `cover_url`

2. **Trong `loadRewardData`**: Sau khi lấy dữ liệu rewards, fetch thêm profiles data:
```text
const { data: profilesData } = await supabase
  .from('profiles')
  .select('id, full_name, public_wallet_address, cover_url')
```
Merge vào danh sách users.

3. **Thêm hàm `isProfileComplete`**:
```text
isProfileComplete(user):
  - has avatar_url (not null, not empty)
  - has full_name (not null, length >= 2)
  - has public_wallet_address (not null, starts with 0x, length 42)
```

4. **Thêm filter state**: `profileFilter: 'all' | 'ready' | 'incomplete'`

5. **UI thay đổi cho mỗi user row**:
   - Hiển thị 3 badge nhỏ: Avatar (xanh/đỏ), Tên (xanh/đỏ), Ví (xanh/đỏ)
   - Nút "Duyệt" bị disabled nếu chưa đủ 3 tiêu chí
   - Tooltip giải thích thiếu gì khi hover nút bị disabled

6. **Thêm summary card**: "Sẵn sàng duyệt: X users | Chưa đủ: Y users"

### Không cần thay đổi database

Tất cả logic kiểm tra đều dựa trên dữ liệu đã có trong bảng `profiles`. Không cần migration.
