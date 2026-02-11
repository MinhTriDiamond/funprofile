

# Trang Danh Sách Users - Tổng Hợp Thông Số Chương Trình Lì Xì 26 Tỷ

## Tổng quan
Tạo trang `/users` hiển thị danh sách tất cả users với đầy đủ thông số hoạt động, điểm Ánh Sáng, thưởng CAMLY, USDT và các khoản tặng thưởng - phục vụ chương trình lì xì Tết.

---

## 1. Tạo hook mới: `src/hooks/useUserDirectory.ts`

Gộp dữ liệu từ nhiều nguồn:
- **`get_user_rewards_v2`** (RPC có sẵn): lấy posts_count, comments_count, reactions_on_posts, friends_count, shares_count, livestreams_count, today_reward, total_reward
- **`light_reputation`** table: lấy total_light_score, tier, total_minted, actions_count
- **`reward_claims`** table: lấy tổng số đã claim
- **`donations`** table: tổng đã tặng và tổng đã nhận (CAMLY, USDT, BTCB...)

Hỗ trợ:
- Tìm kiếm theo username
- Sắp xếp theo: total_reward, total_light_score, posts_count, created_at
- Phân trang (50 users/trang)
- Xuất CSV

---

## 2. Tạo trang mới: `src/pages/UserDirectory.tsx`

### Header
- Tiêu đề: "Danh Sách Thành Viên" với icon lì xì (Gift/Sparkles)
- Subtitle: "Chương trình Lì Xì 26.000.000.000 đồng"
- Tổng số users, tổng CAMLY đã thưởng, tổng Light Score

### Bộ lọc
- Ô tìm kiếm (username)
- Sắp xếp (dropdown): Thưởng cao nhất / Light Score / Bài đăng / Mới nhất
- Nút xuất CSV

### Bảng danh sách (mỗi dòng 1 user)

| Cột | Nội dung |
|-----|----------|
| # | STT |
| Avatar + Tên | Avatar, username, địa chỉ ví rút gọn + link BscScan |
| Hoạt động | Posts, Comments nhận, Reactions nhận, Shares, Friends, Livestreams |
| Light Score | Điểm Ánh Sáng + Tier (New Soul / Light Seeker / ...) + Total Minted FUN |
| Thưởng CAMLY | Tổng tính toán (total_reward) / Đã claim / Còn lại (claimable) |
| Thưởng USDT | Tổng USDT đã nhận từ donations (nếu có) |
| Tặng và Nhận | Tổng đã tặng cho người khác / Tổng đã nhận từ người khác |

### Giao diện di động (Mobile)
- Dạng card thay vì bảng
- Mỗi card hiển thị avatar, tên, các chỉ số chính

---

## 3. Đăng ký route: `src/App.tsx`

Thêm route mới:
```text
<Route path="/users" element={<UserDirectory />} />
```
Đặt trước route `/:username` để tránh xung đột.

---

## 4. Thêm vào Sidebar: `src/components/feed/FacebookLeftSidebar.tsx`

Thêm mục "Danh Sách Users" với icon Users, đặt sau "Lịch Sử Giao Dịch".

---

## Chi tiết kỹ thuật

### Logic hook useUserDirectory:

```text
Bước 1: Gọi get_user_rewards_v2 (limit 10000) -> lấy toàn bộ users với reward stats
Bước 2: Gọi light_reputation table -> lấy light score, tier, minted cho mỗi user
Bước 3: Gọi reward_claims group by user_id -> tổng đã claimed
Bước 4: Gọi donations group by sender_id và recipient_id -> tổng tặng/nhận theo token
Bước 5: Merge tất cả data theo user_id
Bước 6: Áp dụng search, sort, pagination phía client
```

### Xuất CSV columns:
STT, Username, Wallet, Posts, Comments, Reactions, Shares, Friends, Livestreams, Light Score, Tier, FUN Minted, CAMLY Total, CAMLY Claimed, CAMLY Claimable, USDT Received, BTCB Received, Tổng Tặng, Tổng Nhận

---

## Tổng hợp file cần tạo/sửa

| File | Hành động |
|------|-----------|
| `src/hooks/useUserDirectory.ts` | Tạo mới - hook lấy và gộp dữ liệu users |
| `src/pages/UserDirectory.tsx` | Tạo mới - trang danh sách users |
| `src/App.tsx` | Thêm route `/users` |
| `src/components/feed/FacebookLeftSidebar.tsx` | Thêm mục "Danh Sách Users" vào sidebar |

