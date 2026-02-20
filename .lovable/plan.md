
## Sửa 3 vấn đề chính trong hệ thống FUN Money

### Tóm tắt vấn đề

**Vấn đề 1 — Không mint được khi có pending request**

Khi user đã có 1 request đang `pending_sig` hoặc `signed`, nút Mint bị disable hoàn toàn — kể cả khi user có thêm **actions mới** ghi nhận sau thời điểm tạo request cũ. Cần cho phép mint các action mới tạo ra **sau** thời điểm tạo request cuối.

**Vấn đề 2 — Sai logic tính thưởng: reactor thay vì post owner được thưởng**

Trong `ReactionButton.tsx`, khi user A react vào bài của user B:
```typescript
evaluateAsync({ action_type: 'reaction', reference_id: postId });
```
`user_id` trong session là user A (người react), nhưng theo nguyên tắc PPLP, **user B (chủ bài)** mới được thưởng vì được người khác react. Kết quả: 1,777 self-reactions trong database là sai (user tự react vào bài mình rồi tự nhận thưởng).

Tương tự cho `comment` và `share` — người nhận tương tác mới được thưởng, không phải người thực hiện tương tác.

**Vấn đề 3 — Like/unlike/like lại vẫn có thể tính thưởng lại**

Hiện tại `wasNew` kiểm tra `!currentReaction` để quyết định ghi nhận. Nhưng nếu user:
- Like → unlike → like lại → `wasNew = true` → ghi nhận lại

Cần kiểm tra trong `pplp-evaluate` xem đã có `light_action` cho cặp `(actor_id, post_id, action_type)` chưa.

---

### Giải pháp chi tiết

---

#### Fix 1: Cho phép mint actions mới khi có pending request cũ

**Logic mới:** Thay vì disable toàn bộ khi `hasPendingRequests = true`, cần tách thành 2 nhóm:

- **Nhóm A — Actions cũ** (`created_at` trước thời điểm tạo request gần nhất): Đây là actions đã được đưa vào request cũ, `mint_request_id` sẽ được gán đúng sau khi RLS fix hoạt động.
- **Nhóm B — Actions mới** (`created_at` sau thời điểm tạo request gần nhất, hoặc `mint_request_id IS NULL` và `mint_status = 'approved'`): Đây là actions thực sự mới, có thể mint.

Cụ thể:
- `usePendingActions` hiện tại query đúng: `mint_status = 'approved' AND is_eligible = true` — những actions này THỰC SỰ chưa được gán vào request nào (vì RLS fix đã hoạt động: sau khi user bấm mint, actions cũ chuyển sang `pending_sig`).
- Vậy `actions.length > 0` là điều kiện đủ để enable nút Mint.
- Chỉ cần bỏ điều kiện `hasPendingRequests` block toàn bộ, thay bằng message thông tin bên dưới nút.

**Thay đổi trong `LightScoreDashboard.tsx`:**
- Bỏ block hoàn toàn khi `hasPendingRequests`
- Hiển thị nút Mint bình thường nếu `actions.length > 0`
- Hiển thị thêm banner nhỏ "Đang có X yêu cầu đang xử lý" dạng info, không block mint

---

#### Fix 2: Sửa logic reward — chủ bài được thưởng, không phải người tương tác

**Nguyên tắc PPLP đúng:**
- `post` → user tạo bài được thưởng ✓ (đã đúng)
- `reaction` → **chủ bài** được thưởng khi người KHÁC react ✓ (cần sửa)
- `comment` → **chủ bài** được thưởng khi người KHÁC comment ✓ (cần sửa)  
- `share` → **chủ bài** được thưởng khi người KHÁC share ✓ (cần sửa)
- `friend` → cả 2 người được thưởng ✓ (đã đúng)

**Cách sửa trong `pplp-evaluate` Edge Function:**

Cần thêm một tham số mới `actor_id` và `beneficiary_id`:
- Với `reaction/comment/share`: `actor_id` = người thực hiện (dùng để check duplicate), `beneficiary_id` = chủ bài (được thưởng, tức là `user_id` trong `light_actions`)
- Edge function cần query `posts` table để tìm `user_id` của bài dựa vào `reference_id`

Cụ thể sửa trong `pplp-evaluate/index.ts`:
```typescript
// Với action_type = 'reaction' | 'comment' | 'share':
// reference_id = post_id
// Tìm post_owner_id từ posts table
// Insert light_action với user_id = post_owner_id (người được thưởng)
// Check duplicate: đã có light_action nào với (actor_id, reference_id, action_type) chưa?
```

**Thêm trường `actor_id` vào `light_actions`** (Migration):
- `actor_id UUID` — người thực sự thực hiện hành động (dùng cho anti-duplicate)
- `user_id` vẫn là người được thưởng

**Sửa duplicate check trong `pplp-evaluate`:**
```typescript
// Kiểm tra đã có light_action với actor_id + reference_id + action_type chưa
// Thay vì dùng daily_count by action_type (hiện tại)
const { count: existingCount } = await supabase
  .from('light_actions')
  .select('id', { count: 'exact', head: true })
  .eq('actor_id', actorId)           // Người thực hiện
  .eq('reference_id', reference_id)  // Bài viết cụ thể
  .eq('action_type', action_type);   // Loại action

if (existingCount > 0) return 409; // Already rewarded for this specific post
```

Điều này đảm bảo:
- Like → ghi nhận 1 lần cho chủ bài
- Unlike → unlike không gọi evaluate, không có vấn đề
- Like lại (sau khi unlike) → `existingCount > 0` → từ chối, không ghi nhận lại

**Sửa trong `ReactionButton.tsx`:**
Truyền thêm `post_owner_id` vào evaluate để edge function không cần query thêm:
```typescript
evaluateAsync({
  action_type: 'reaction',
  reference_id: postId,
  // beneficiary_id không cần truyền vì edge function sẽ tự query
});
```
Edge function tự query `posts` để tìm owner — không cần thay đổi frontend call signature.

**Tương tự sửa `CommentSection.tsx`** — hiện đang ghi nhận cho người comment, cần đổi sang cho chủ bài.

---

#### Fix 3: Hiển thị 2 section riêng biệt trong UI

Sau khi fix logic, UI cần hiển thị rõ ràng:
- **Section A: FUN Sẵn Sàng Mint** — actions với `mint_status = 'approved'`, `mint_request_id IS NULL`
- **Section B: FUN Đang Xử Lý** — mint requests đang `pending_sig / signed / submitted`
- **Section C: Lịch Sử** — `confirmed / failed`

Section A và B song song, không block nhau.

---

### Tổng hợp thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/` | Thêm cột `actor_id` vào `light_actions` |
| `supabase/functions/pplp-evaluate/index.ts` | (1) Query post owner để ghi thưởng đúng người (2) Sửa duplicate check theo `actor_id + reference_id + action_type` (3) Không tính self-action (actor = post owner) |
| `src/components/wallet/LightScoreDashboard.tsx` | Bỏ block mint khi có pending, hiển thị 2 section riêng biệt |

---

### Luồng sau khi fix

```text
User A react vào bài của User B
  ↓
ReactionButton: evaluateAsync({ action_type: 'reaction', reference_id: postId })
  ↓
pplp-evaluate: 
  - actorId = User A (từ session)
  - Query: posts WHERE id = postId → post_owner = User B
  - Nếu User A == User B → skip (self-react, không thưởng)
  - Check duplicate: light_actions WHERE actor_id=A AND reference_id=postId AND type=reaction
  - Nếu chưa có → INSERT light_action với user_id = User B (chủ bài được thưởng)
  ↓
User B mở tab FUN Money → thấy FUN mới sẵn sàng mint
User B bấm Mint → tạo request (User B's actions)
  ↓
User B có request pending_sig, ĐỒNG THỜI User A react thêm bài khác của B
  ↓
Action mới của reaction lần 2 (bài khác) ghi vào light_actions với user_id = B, mint_status = 'approved'
  ↓
Tab FUN Money của B: Section "Sẵn sàng" hiện X FUN mới + Section "Đang xử lý" hiện request cũ
  ↓
User B có thể bấm Mint cho X FUN mới (không bị block bởi request cũ)
```
