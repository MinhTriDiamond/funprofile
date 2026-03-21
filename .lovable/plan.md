

## Tích hợp Angel AI chấm điểm nội dung bài đăng & nhắc nhở nhẹ nhàng

### Tổng quan
Thay vì dùng logic cứng (đếm ký tự, kiểm tra trùng lặp) để quyết định thưởng CAMLY, sẽ gọi Angel AI (tại angel.fun.rich) ngay trong quá trình tạo bài để chấm điểm nội dung. Dựa trên kết quả chấm, hệ thống sẽ:
- Quyết định `is_reward_eligible` (có tặng CAMLY hay không)
- Trả về lời nhắc nhở nhẹ nhàng từ Angel khi bài viết chất lượng thấp

### Luồng hoạt động mới

```text
User đăng bài → create-post edge function
  ├─ Kiểm tra cơ bản (banned, content length, duplicate hash)
  ├─ GỌI Angel AI để chấm điểm nội dung
  │   ├─ Gửi content + metadata → Angel AI endpoint
  │   └─ Nhận: score (0-10), is_positive, angel_message
  ├─ Quyết định reward dựa trên Angel score
  │   ├─ Score >= 6: is_reward_eligible = true
  │   ├─ Score < 6: is_reward_eligible = false + kèm angel_message
  │   └─ Score < 3: cảnh báo mạnh hơn (nội dung spam/kiếm coin)
  ├─ Lưu bài viết + angel_score vào DB
  └─ Trả response kèm angel_feedback cho frontend
```

### Chi tiết kỹ thuật

#### 1. Cập nhật `create-post` edge function
- Thêm hàm `evaluateWithAngel()` gọi Angel AI endpoint (`https://ssjoetiitctqzapymtzl.supabase.co/functions/v1/angel-chat`) với prompt chuyên biệt yêu cầu Angel chấm điểm nội dung
- Prompt sẽ yêu cầu Angel trả JSON: `{ score: number, is_positive: boolean, message: string }`
- Nếu Angel AI không khả dụng (timeout/error), fallback về logic hiện tại (kiểm tra 120 ký tự)
- Dùng `ANGEL_AI_API_KEY` đã có sẵn trong secrets

#### 2. Logic chấm điểm Angel
- **Score 7-10**: Nội dung tích cực, có giá trị → `is_reward_eligible = true`, toast thành công bình thường
- **Score 4-6**: Nội dung trung bình → `is_reward_eligible = false`, Angel nhắc nhẹ: *"Angel thấy bài viết này chưa thật sự truyền cảm hứng nè 💛 Hãy chia sẻ sâu hơn để nhận thưởng nhé ✨"*
- **Score 1-3**: Nội dung ngắn/spam/kiếm coin → `is_reward_eligible = false`, Angel nhắc: *"Angel nhắc nhẹ: viết từ trái tim sẽ được tặng thưởng nhiều hơn nha 🌟 Nội dung quá ngắn hoặc chưa mang giá trị tích cực sẽ không nhận được CAMLY đâu ạ 💛"*

#### 3. Cập nhật response từ `create-post`
- Thêm fields: `angel_score`, `angel_feedback` (lời nhắn từ Angel), `reward_reason`
- Frontend nhận và hiển thị `angel_feedback` dưới dạng toast với tông Angel nhẹ nhàng

#### 4. Cập nhật frontend (`useCreatePost.ts`)
- Đọc `angel_feedback` từ response
- Hiển thị toast nhắc nhở từ Angel khi bài không đủ điểm thưởng
- Bài vẫn được đăng bình thường, chỉ không nhận CAMLY

#### 5. Giữ lại các kiểm tra cứng hiện tại
- Vẫn giữ duplicate hash check, banned check, repetitive content blocking
- Angel AI chỉ thay thế logic "120 ký tự" và "low-quality detection" cứng
- Nếu Angel timeout > 5s, fallback về rule 120 chars

### Files cần chỉnh sửa
1. **`supabase/functions/create-post/index.ts`** — Thêm Angel AI evaluation, thay logic cứng bằng AI scoring
2. **`src/hooks/useCreatePost.ts`** — Xử lý `angel_feedback` trong response, hiển thị toast Angel

