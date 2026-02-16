

## Chặn thưởng CAMLY cho bài viết ngắn (vẫn cho đăng bình thường)

### Vấn đề
Các bài viết dạng câu ngắn 1 dòng (ví dụ: "Của một niềm đau không lời.", "Không ai nghe tiếng rất khẽ") dài khoảng 25-35 ký tự, vượt qua ngưỡng low-quality hiện tại (15 ký tự) nên vẫn được tính thưởng CAMLY. Cần cho phép đăng bình thường nhưng không tặng thưởng.

### Giải pháp
Thêm một bước kiểm tra mới trong Edge Function `create-post`: bài viết chỉ có text (không kèm ảnh/video) mà dưới **50 ký tự** sẽ được đánh dấu `is_reward_eligible = false`, nhưng vẫn giữ `moderation_status = 'approved'` (hiển thị bình thường trên feed).

### Quy tắc chi tiết

| Điều kiện | Cho đăng? | Thưởng CAMLY? |
|-----------|-----------|---------------|
| Text < 15 ký tự, không media | Chờ duyệt (pending_review) | Không |
| Text 15-49 ký tự, không media | Có (approved) | **Không** |
| Text >= 50 ký tự, không media | Có (approved) | Có |
| Có media (ảnh/video) | Có (approved) | Có |

### Chi tiết kỹ thuật

**File: `supabase/functions/create-post/index.ts`**

Sau khối LOW-QUALITY DETECTION (dòng 164-172), thêm khối SHORT CONTENT CHECK:

```typescript
// === SHORT CONTENT CHECK (no reward for short text-only posts) ===
if (isRewardEligible && mediaCount === 0 && trimmedContent.length < 50) {
  console.log("[create-post] Short text-only post, no reward:", trimmedContent.length, "chars");
  isRewardEligible = false;
}
```

Bài viết vẫn hiển thị bình thường, chỉ không được tính vào phần thưởng CAMLY.

