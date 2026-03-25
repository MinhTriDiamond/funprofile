

## Phát hiện lỗi công thức tính thưởng CAMLY

### Vấn đề: 2 hàm RPC tính khác nhau

Hệ thống đang có **2 hàm RPC** tính thưởng, nhưng **công thức giai đoạn cũ (trước 15/01/2026) không khớp nhau**:

| Loại | `get_user_rewards_v2` (Ranking) | `get_user_honor_stats` (Honor Board) |
|------|------|------|
| **Posts cũ** | 10,000 CAMLY | 5,000 CAMLY |
| **Comments cũ** | 2,000 CAMLY | 1,000 CAMLY |
| **Shares cũ** | 10,000 CAMLY | 1,000 CAMLY |
| Reactions cũ | 1,000 | 1,000 (giống) |
| Friends cũ | 10,000 | 10,000 (giống) |
| **PPLP reward** | Không cộng | **Có cộng** thêm `light_actions.mint_amount` |

**Hàm `get_user_honor_stats`** (dùng cho Honor Board trên profile) đang dùng **hệ số mới** cho cả dữ liệu cũ → tổng thưởng bị **thấp hơn** so với `get_user_rewards_v2`.

Ngược lại, `get_user_honor_stats` **cộng thêm PPLP reward** mà `get_user_rewards_v2` thì không.

### Đề xuất: Đồng bộ 2 hàm

Cần thống nhất: **giai đoạn cũ dùng hệ số nào?**

**Phương án A — Giữ hệ số cũ cao** (như `get_user_rewards_v2`):
- Posts cũ = 10,000, Comments cũ = 2,000, Shares cũ = 10,000
- Đây là hệ số ban đầu khi hệ thống ra mắt

**Phương án B — Dùng hệ số mới thống nhất** (như `get_user_honor_stats`):
- Posts cũ = 5,000, Comments cũ = 1,000, Shares cũ = 1,000
- Giảm thưởng giai đoạn cũ

### Thay đổi kỹ thuật

1. **Cập nhật migration SQL** — sửa hàm có hệ số sai để khớp với hàm còn lại
2. **Cộng PPLP reward** vào cả 2 hàm (nếu muốn) hoặc bỏ khỏi cả 2
3. **Cập nhật `useRewardCalculation.ts`** — đồng bộ `REWARD_CONFIG` comment cho đúng thực tế

