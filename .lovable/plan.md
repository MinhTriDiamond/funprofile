

# Kế Hoạch: Lọc Bài Trùng Nội Dung - Chống Lạm Dụng Thưởng

## Tổng Quan

Khi một user đăng nhiều bài có nội dung giống/gần giống nhau, chỉ bài **đầu tiên** được tính thưởng (CAMLY + Light Score + PPLP mint). Các bài sau vẫn được đăng bình thường nhưng được đánh dấu `is_reward_eligible = false` và hiển thị thông báo nhắc nhở yêu thương.

## Cơ Chế Phát Hiện Trùng

Sử dụng **content hash** (MD5 của nội dung đã normalize):
- Normalize: trim, lowercase, loại bỏ khoảng trắng thừa, loại bỏ emoji/ký tự đặc biệt
- So sánh hash với các bài trước đó của cùng user (trong 30 ngày gần nhất)
- Nếu hash trùng -> bài trùng lặp

## Chi Tiết Thay Đổi

### 1. Migration: Thêm cột vào bảng `posts`

Thêm 2 cột mới:
- `content_hash TEXT` -- MD5 hash của nội dung đã normalize
- `is_reward_eligible BOOLEAN DEFAULT true` -- đánh dấu bài có đủ điều kiện nhận thưởng

Tạo index trên `(user_id, content_hash)` để query nhanh.

### 2. Sửa: `supabase/functions/create-post/index.ts`

Thêm logic kiểm tra trùng **trong edge function** (server-side, không bypass được):

- Sau khi xác thực user, trước khi insert:
  1. Normalize nội dung: trim, lowercase, loại bỏ whitespace thừa
  2. Tính MD5 hash
  3. Query: tìm bài cùng `user_id` + cùng `content_hash` trong 30 ngày
  4. Nếu tìm thấy -> set `is_reward_eligible = false`
  5. Insert post với `content_hash` và `is_reward_eligible`
- Trả về thêm trường `is_reward_eligible` và `duplicate_detected` trong response

### 3. Sửa: `supabase/functions/pplp-evaluate/index.ts`

Thêm kiểm tra trước khi đánh giá:

- Sau khi parse `reference_id` (post ID):
  1. Nếu `action_type === 'post'` và có `reference_id`:
     - Query bảng `posts` kiểm tra `is_reward_eligible`
     - Nếu `is_reward_eligible = false` -> trả về ngay, không tính điểm, ghi log
  2. Nếu không có `reference_id`: kiểm tra trùng bằng `content` trực tiếp
     - Normalize + hash content
     - So sánh với `light_actions.content_preview` gần đây của cùng user

### 4. Sửa: RPC `get_user_rewards_v2`

Migration cập nhật function để **chỉ đếm** các bài có `is_reward_eligible = true`:

Thay đổi trong các CTE:
- `new_daily_posts`: thêm `AND is_reward_eligible = true` (hoặc `AND is_reward_eligible IS NOT FALSE` để tương thích với bài cũ chưa có cột)
- `old_stats.old_posts`: tương tự, nhưng bài cũ mặc định `true` nên dùng `COALESCE(is_reward_eligible, true) = true`

### 5. Sửa: `src/components/feed/FacebookCreatePost.tsx`

Sau khi gọi `create-post` thành công:

- Đọc `result.duplicate_detected` từ response
- Nếu `true`: hiển thị toast nhắc nhở yêu thương thay vì toast thành công thông thường
- Nếu `false`: hiển thị toast thành công như bình thường
- Không gọi `evaluateAsync()` nếu bài trùng

Thông báo nhắc nhở (ví dụ):

> "Bài viết đã được đăng! Tuy nhiên, nội dung này tương tự một bài trước đó nên không được tính thưởng thêm. Hãy sáng tạo nội dung mới để lan tỏa Ánh Sáng nhiều hơn nhé! ✨🙏"

### 6. Tạo mới: `src/utils/contentHash.ts`

Utility dùng chung (client-side, chỉ để hiển thị preview nếu cần):

```typescript
export function normalizeContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}
```

Logic hash chính nằm ở server-side (edge function), client-side chỉ dùng để hiển thị.

## Luồng Xử Lý

```text
User nhập nội dung -> Bấm Đăng
       |
       v
  create-post Edge Function
       |
       v
  Normalize content -> Tính MD5 hash
       |
       v
  Query: Có bài nào cùng user_id + content_hash trong 30 ngày?
       |
   +---+---+
   |       |
  Không   Có (trùng)
   |       |
   v       v
  Insert post              Insert post
  is_reward_eligible=true   is_reward_eligible=false
  duplicate_detected=false  duplicate_detected=true
       |                          |
       v                          v
  Client: toast thành công   Client: toast nhắc nhở yêu thương
  + gọi PPLP evaluate       + KHÔNG gọi PPLP evaluate
       |                          |
       v                          v
  PPLP evaluate              Không tính điểm Light Score
  -> Tính điểm bình thường   -> Không tính thưởng CAMLY
  -> Đủ điều kiện mint       -> Không đủ điều kiện mint
```

## Danh Sách Files

| File | Hành động |
|------|-----------|
| Migration SQL mới | **Tạo mới** -- Thêm cột `content_hash`, `is_reward_eligible` vào bảng `posts` |
| Migration SQL mới | **Tạo mới** -- Cập nhật `get_user_rewards_v2` thêm điều kiện `is_reward_eligible` |
| `supabase/functions/create-post/index.ts` | **Sửa** -- Thêm logic normalize + hash + check trùng |
| `supabase/functions/pplp-evaluate/index.ts` | **Sửa** -- Kiểm tra `is_reward_eligible` trước khi đánh giá |
| `src/components/feed/FacebookCreatePost.tsx` | **Sửa** -- Hiển thị toast nhắc nhở + skip PPLP nếu trùng |

## Xử Lý Edge Cases

| Trường hợp | Xử lý |
|-------------|-------|
| Bài chỉ có media, không có text | Không kiểm tra trùng (hash rỗng = bỏ qua) |
| Bài có text rất ngắn (< 10 ký tự) | Vẫn kiểm tra trùng bình thường |
| Bài cũ chưa có `content_hash` | `COALESCE(is_reward_eligible, true)` = true, không ảnh hưởng |
| User sửa 1-2 từ để lách | Normalize loại bỏ emoji/ký tự đặc biệt, nhưng nếu thay đổi từ thực sự thì vẫn tính bài mới (chấp nhận) |
| User đăng lại sau 30 ngày | Được tính thưởng lại (window 30 ngày) |

## Ghi Chú Kỹ Thuật

- **Hash server-side**: Dùng Web Crypto API (`crypto.subtle.digest`) trong Deno edge function, không phụ thuộc thư viện ngoài
- **Window 30 ngày**: Đủ dài để ngăn spam, đủ ngắn để cho phép repost hợp lý
- **Backward compatible**: Bài cũ không có `content_hash` mặc định `is_reward_eligible = true`
- **Không chặn đăng bài**: Bài trùng vẫn được đăng, chỉ không tính thưởng
- **Thông báo tích cực**: Giọng văn yêu thương, khích lệ sáng tạo mới, không phạt hay chỉ trích

