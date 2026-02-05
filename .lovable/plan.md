

## Báo Cáo Trạng Thái Hệ Thống PPLP & Mint FUN Money

### Đã Hoàn Thành

| Thành Phần | Trạng Thái | Mô Tả |
|------------|------------|-------|
| **Database Tables** | ✅ | `light_actions`, `light_reputation`, `mint_epochs` đã tạo |
| **Database Functions** | ✅ | `calculate_light_score`, `get_user_light_score` RPC |
| **Edge Function: pplp-evaluate** | ✅ | ANGEL AI đánh giá hành động theo 5 Pillars of Light |
| **Edge Function: pplp-get-score** | ✅ | Lấy Light Score và stats của user |
| **Edge Function: pplp-mint-fun** | ✅ | Chuẩn bị dữ liệu mint FUN Money (EIP-712) |
| **Hook: useLightScore** | ✅ | Fetch và hiển thị Light Score |
| **Hook: useMintFun** | ✅ | Gọi mint và handle kết quả |
| **Component: LightScoreDashboard** | ✅ | Hiển thị 5 Pillars, Tier, Actions, Claim button |
| **Config: pplp.ts** | ✅ | Base rewards, daily caps, tier thresholds |
| **light_reputation records** | ✅ | Đã có 3 users với reputation khởi tạo |

### Chưa Hoàn Thành (Quan Trọng)

| Thành Phần | Trạng Thái | Vấn Đề |
|------------|------------|--------|
| **light_actions records** | ⚠️ TRỐNG | Chưa có action nào được ghi nhận |
| **Trigger từ Create Post** | ❌ | Tạo bài viết chưa gọi `pplp-evaluate` |
| **Trigger từ Comment** | ❌ | Bình luận chưa gọi `pplp-evaluate` |
| **Trigger từ Reaction** | ❌ | Thả cảm xúc chưa gọi `pplp-evaluate` |

### Nguyên Nhân Gốc

Các component social (`FacebookCreatePost`, `CommentSection`, `ReactionButton`) chưa được tích hợp để gọi `pplp-evaluate` sau khi thực hiện action thành công. Điều này có nghĩa:
- User tạo bài viết → Bài được lưu ✅ → PPLP KHÔNG được gọi ❌
- User bình luận → Comment được lưu ✅ → PPLP KHÔNG được gọi ❌
- User thả reaction → Reaction được lưu ✅ → PPLP KHÔNG được gọi ❌

---

## Kế Hoạch Tiếp Theo: Tích Hợp PPLP Triggers

### Bước 1: Tạo Hook Tiện Ích `usePplpEvaluate`

Tạo một hook mới để gọi `pplp-evaluate` một cách dễ dàng từ bất kỳ component nào.

**File mới:** `src/hooks/usePplpEvaluate.ts`

```typescript
// Gọi pplp-evaluate với action_type, reference_id, và content
// Chạy async (không block UI)
// Handle errors gracefully (không làm gián đoạn trải nghiệm)
```

### Bước 2: Tích Hợp Vào Create Post

**File:** `src/components/feed/FacebookCreatePost.tsx`

Sau khi bài viết được tạo thành công (dòng 471), thêm:

```typescript
// Gọi PPLP evaluate cho action "post"
// Tham số: action_type='post', reference_id=post_id, content=nội dung bài
// Chạy async, không await (UX không bị chặn)
```

### Bước 3: Tích Hợp Vào Comment Section

**File:** `src/components/feed/CommentSection.tsx`

Sau khi comment được tạo thành công (dòng 177), thêm:

```typescript
// Gọi PPLP evaluate cho action "comment"
// Tham số: action_type='comment', reference_id=comment_id, content=nội dung comment
```

### Bước 4: Tích Hợp Vào Reaction Button

**File:** `src/components/feed/ReactionButton.tsx`

Sau khi reaction được thêm thành công (dòng 278), thêm:

```typescript
// Gọi PPLP evaluate cho action "reaction"
// Tham số: action_type='reaction', reference_id=post_id
// Không gửi content (reaction không có nội dung)
```

### Bước 5: Tích Hợp Vào Friend Request

**File:** `src/components/friends/FriendRequestButton.tsx` (nếu có)

Sau khi kết bạn thành công:

```typescript
// Gọi PPLP evaluate cho action "friend"
// Tham số: action_type='friend', reference_id=friend_user_id
```

---

## Lưu Đồ Hoạt Động

```text
User Action (Post/Comment/Reaction)
        │
        ▼
┌─────────────────┐
│ Database Insert │  ← Lưu vào posts/comments/reactions table
└────────┬────────┘
         │
         ▼ (Async, không block)
┌─────────────────────┐
│ pplp-evaluate       │
│ Edge Function       │
│                     │
│ • Kiểm tra daily cap│
│ • Gọi ANGEL AI      │
│ • Tính Light Score  │
│ • Lưu light_actions │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ light_actions table │
│ (status: approved/  │
│  rejected)          │
└────────┬────────────┘
         │
         ▼ (User chủ động)
┌─────────────────────┐
│ Wallet Dashboard    │
│ → Claim FUN Money   │
└─────────────────────┘
```

---

## Kết Quả Mong Đợi

Sau khi hoàn thành:

| Action | Trước | Sau |
|--------|-------|-----|
| Tạo bài viết | Không ghi nhận | +100 base FUN (× multipliers) |
| Bình luận | Không ghi nhận | +20 base FUN (× multipliers) |
| Thả reaction | Không ghi nhận | +10 base FUN (× multipliers) |
| Kết bạn | Không ghi nhận | +20 base FUN (× multipliers) |

User có thể xem Light Actions gần đây trong `LightScoreDashboard` và Claim để mint FUN Money!

---

## Chi Tiết Kỹ Thuật

### Hook usePplpEvaluate

```typescript
interface PplpEvaluateParams {
  action_type: 'post' | 'comment' | 'reaction' | 'share' | 'friend';
  reference_id?: string;
  content?: string;
}

const usePplpEvaluate = () => {
  const evaluate = async (params: PplpEvaluateParams) => {
    // Fire-and-forget - không block UI
    // Log kết quả để debug
    // Không throw error nếu thất bại
  };
  
  return { evaluate };
};
```

### Điểm Tích Hợp Cụ Thể

**FacebookCreatePost.tsx (sau dòng 471):**
```typescript
// Sau: toast.success(t('postPublished'));
// Thêm: evaluate({ action_type: 'post', reference_id: result.post?.id, content });
```

**CommentSection.tsx (sau dòng 178):**
```typescript
// Sau: toast.success(t('commentPosted'));
// Thêm: evaluate({ action_type: 'comment', content: newComment });
```

**ReactionButton.tsx (sau dòng 282):**
```typescript
// Sau: onReactionChange(wasNew ? likeCount + 1 : likeCount, reactionType);
// Thêm: if (wasNew) evaluate({ action_type: 'reaction', reference_id: postId });
```

