

## Gửi thông báo riêng cho user có bài viết không đủ điều kiện chất lượng

### Hiện trạng
- **343 user** đã nhận thông báo `gift_recouped` — đúng rồi, giữ nguyên
- **477 user** có tổng **7,915 bài** không đủ điều kiện (ngắn, lặp, chất lượng thấp) — chưa được thông báo
- Tuyết có CẢ HAI: 23 gift + 534 bài ngắn → cần 2 thông báo riêng biệt

### Kế hoạch

#### 1. Migration — INSERT thông báo `quality_ineligible` cho 477 user

```sql
INSERT INTO notifications (user_id, actor_id, type, metadata)
SELECT 
  user_id,
  '733a0ca6-91e2-4513-a1a0-ce34fea484f8',
  'reward_adjustment',
  jsonb_build_object(
    'reason', 'quality_ineligible',
    'post_count', COUNT(*),
    'amount', COUNT(*) * 5000,
    'message', '💛 Xin chào bạn yêu thương! Hệ thống đã rà soát lại và phát hiện một số bài viết của bạn chưa đủ điều kiện nhận thưởng CAMLY (do nội dung quá ngắn, trùng lặp hoặc chưa đạt tiêu chuẩn chất lượng). Số CAMLY từ những bài này đã được điều chỉnh lại cho chính xác. Xin lỗi bạn vì sự bất tiện — chúng mình yêu thương bạn thật nhiều! 💖 Hãy tiếp tục chia sẻ những ánh sáng đẹp nhé! Chúc bạn luôn vui vẻ, giàu có và hạnh phúc cùng Fun.rich 🌞💎✨'
  )
FROM posts
WHERE is_reward_eligible = false 
  AND (post_type IS NULL OR post_type <> 'gift_celebration')
GROUP BY user_id;
```

#### 2. Không thay đổi frontend
- Type `reward_adjustment` + icon + routing đã hoạt động
- Message hiển thị từ `metadata.message` — tự động đúng theo từng reason

### Kết quả
- User chỉ có gift → nhận 1 thông báo gift
- User chỉ có bài ngắn → nhận 1 thông báo quality  
- User như Tuyết (cả 2) → nhận 2 thông báo riêng biệt, mỗi cái ghi rõ lý do cụ thể
- Tái sử dụng cho tương lai: thay `reason` + `message` phù hợp

### Files thay đổi
- `supabase/migrations/...new.sql` — INSERT 477 thông báo quality_ineligible

