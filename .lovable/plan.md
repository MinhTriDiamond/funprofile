

## Tạo bảng thống kê chi tiết quy trình Mint FUN theo từng User

### Mục tiêu
Thêm một sub-tab mới "User Mint Stats" trong PplpMintTab, hiển thị bảng tổng hợp toàn bộ quy trình mint của từng user: Light Score, số actions, mint requests theo trạng thái, tổng FUN đã mint thành công — giúp admin theo dõi chi tiết từng người.

### Thay đổi

**File mới: `src/components/admin/UserMintStatsTab.tsx`**

Tạo component hiển thị bảng thống kê per-user với các cột:
| Cột | Mô tả |
|-----|-------|
| User | Avatar + username |
| Tổng Actions | Số light_actions |
| Light Score | Tổng light_score tích lũy |
| Phân bổ Epoch | Số FUN được allocation (từ mint_allocations) |
| Chờ ký | Số mint_requests ở pending_sig/signing |
| Đã ký | Số requests ở signed |
| Đã gửi | Số requests ở submitted |
| Hoàn tất | Số requests confirmed |
| Thất bại | Số requests failed |
| Tổng FUN Minted | Tổng amount_display của confirmed requests |
| Ví | Địa chỉ ví rút gọn |

Tính năng:
- Tìm kiếm theo username
- Sắp xếp theo bất kỳ cột nào (click header)
- Phân trang (20 users/trang)
- Click vào user để xem chi tiết danh sách mint requests của họ (expand row)
- Badge màu cho từng trạng thái
- Tổng hợp (summary row) ở đầu bảng

Dữ liệu lấy từ 3 bảng: `profiles`, `light_actions` (aggregate), `pplp_mint_requests` (aggregate), `mint_allocations` (aggregate) — query qua RPC hoặc trực tiếp client-side join.

**File sửa: `src/components/admin/PplpMintTab.tsx`**

- Thêm tab mới "📊 Thống kê User" vào TabsList hiện có (bên cạnh các tab pending_sig, signed, submitted, confirmed, failed)
- Import và render `UserMintStatsTab` trong TabsContent tương ứng

### Chi tiết kỹ thuật

- Tạo database function (RPC) `get_user_mint_stats` để aggregate dữ liệu server-side thay vì fetch toàn bộ rồi join client — tối ưu hiệu suất
- Function trả về: `user_id, username, avatar_url, wallet_address, total_actions, total_light_score, epoch_allocated, pending_count, signed_count, submitted_count, confirmed_count, failed_count, total_minted`
- Hỗ trợ tham số `search_query` để filter theo username
- Component sử dụng `useQuery` với staleTime phù hợp

