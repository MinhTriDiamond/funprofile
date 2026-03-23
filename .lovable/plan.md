

## Vấn đề: Sai lệch số bài viết giữa Trang cá nhân và Honor Board

### Phân tích nguyên nhân

Dữ liệu thực tế của `@utopiathuy413`:

```text
Trang cá nhân (useProfile.ts):
  - 3,139 bài gốc (bao gồm 236 gift_celebration)
  - 321 bài chia sẻ
  → Tổng hiển thị: ~3,460 bài → "1311 bài còn lại"

Honor Board (get_user_honor_stats RPC):
  - posts_count = 436 ← CON SỐ SAI
  - Lý do: RPC áp dụng LEAST(10/ngày) cho posts_count
    → Đếm tối đa 10 bài/ngày thay vì đếm thực tế
  - Ngoài ra: chỉ đếm bài có is_reward_eligible = true
    → 2,686 bài (loại 453 bài không đủ điều kiện thưởng)
  - Không đếm gift_celebration (236 bài)
```

**Nguyên nhân gốc**: Hàm RPC `get_user_honor_stats` dùng chung biến `v_posts_count` cho cả mục đích **hiển thị** và **tính thưởng**. Giới hạn 10 bài/ngày chỉ nên áp dụng cho tính thưởng, không nên ảnh hưởng đến con số hiển thị.

### Giải pháp

Sửa hàm RPC `get_user_honor_stats` để trả về thêm các trường **đếm thực tế** (actual counts), tách biệt với các trường đã capped dùng để tính thưởng.

#### 1. Cập nhật RPC `get_user_honor_stats`
- Thêm cột trả về: `actual_posts_count`, `actual_reactions_count`, `actual_comments_count`, `actual_shares_count`
- `actual_posts_count`: đếm TẤT CẢ bài viết (trừ `gift_celebration`), không giới hạn 10/ngày, không lọc `is_reward_eligible`
- Các cột cũ (`posts_count`, v.v.) giữ nguyên logic capped cho tính thưởng

#### 2. Cập nhật `CoverHonorBoard.tsx`
- Dùng `actual_posts_count` thay vì `posts_count` cho mục "Bài viết" hiển thị
- Tương tự cho reactions, comments, shares nếu cần
- Giữ nguyên logic tính thưởng dùng các trường capped

#### 3. Cập nhật TypeScript types
- Types sẽ tự động cập nhật sau migration

### Kết quả mong đợi

```text
Honor Board sau khi sửa:
  Bài viết:  2,903 (thực tế, trừ gift_celebration)
  Cảm xúc:  số thực tế (không cap 50/ngày)
  Bình luận: số thực tế (không cap 50/ngày)
  Thưởng:    giữ nguyên logic capped
```

