

# Thu hồi điểm spam & chặn bài lặp

## Phạm vi ảnh hưởng (đã rà soát)

| Metric | Giá trị |
|--------|---------|
| Users bị ảnh hưởng | 74 |
| Bài spam eligible | 325 light_actions |
| Light Score cần thu hồi | 12,445.29 |
| Mint amount cần thu hồi | 978 |

Pattern spam: "con biết ơn biết ơn", "con là ... của cha", "con xin", "con vô cùng", "Đang LIVE trên FUN" — nội dung 15-120 ký tự, công thức lặp.

## 3 bước thực hiện

### Bước 1: Thu hồi dữ liệu cũ (SQL data updates)

**1a.** Đánh dấu tất cả bài spam → `is_reward_eligible = false`:
```sql
UPDATE posts SET is_reward_eligible = false
WHERE is_reward_eligible = true
  AND LENGTH(content) BETWEEN 15 AND 120
  AND content ~* '(biết ơn biết ơn|con là .* của cha|con xin biết ơn|con vô cùng|Đang LIVE trên FUN)'
```

**1b.** Đánh dấu light_actions liên kết → `is_eligible = false`, `mint_status = 'revoked'`:
```sql
UPDATE light_actions SET is_eligible = false, mint_status = 'revoked'
WHERE action_type = 'post' AND is_eligible = true
  AND reference_id IN (
    SELECT id FROM posts WHERE is_reward_eligible = false
    AND content ~* '(biết ơn biết ơn|con là .* của cha|con xin biết ơn|con vô cùng|Đang LIVE trên FUN)'
  )
```

**1c.** Trừ Light Score từ `light_reputation` cho từng user:
```sql
UPDATE light_reputation lr SET
  total_light_score = GREATEST(0, lr.total_light_score - revoked.total_ls),
  actions_count = GREATEST(0, lr.actions_count - revoked.cnt)
FROM (
  SELECT user_id, SUM(light_score) as total_ls, COUNT(*) as cnt
  FROM light_actions
  WHERE mint_status = 'revoked' AND action_type = 'post'
  GROUP BY user_id
) revoked
WHERE lr.user_id = revoked.user_id
```

Trigger `update_reputation_on_action` chỉ chạy khi INSERT nên UPDATE light_actions sẽ không gây side-effect.

### Bước 2: Chặn bài lặp trong `create-post/index.ts`

Thêm hàm `detectRepetitiveContent()` sau duplicate hash check:

1. Fetch 5 bài gần nhất trong ngày của user
2. Tính word overlap giữa bài mới và từng bài cũ
3. **≥ 3 bài overlap > 60%** → **chặn hoàn toàn** (return 400 + `blocked: true`)
4. **1-2 bài overlap > 60%** → cho đăng nhưng `is_reward_eligible = false` + `repetitive_warning: true`

Lời nhắn khi chặn:
> "Angel thấy bạn đã chia sẻ nội dung tương tự nhiều lần rồi nè 💛 Hãy dành thời gian viết những trải nghiệm thật sự của bạn nhé ✨"

Lời nhắn khi cảnh báo:
> "Angel nhắc nhẹ: bài viết này khá giống với bài trước của bạn nên sẽ không được tính điểm nha 💛"

### Bước 3: Xử lý response trong `useCreatePost.ts`

- `blocked: true` → `toast.warning()` hiển thị `warning_message`, duration 10s, không reset form
- `repetitive_warning: true` → `toast.warning()` với lời nhắc, duration 8s, vẫn đăng thành công

### Files cần sửa
1. **SQL data updates** (3 lệnh UPDATE qua insert tool) — thu hồi điểm cũ
2. **`supabase/functions/create-post/index.ts`** — thêm `detectRepetitiveContent()` + blocking logic
3. **`src/hooks/useCreatePost.ts`** — xử lý `blocked` và `repetitive_warning` response

