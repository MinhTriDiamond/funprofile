

# Reset lệnh rút thưởng & rà soát chặn user bị ban

## Tình trạng hiện tại

- **41 lệnh rút** trong `reward_claims` — tất cả từ user không bị ban (đã dọn lệnh banned trước đó)
- **0 lệnh dưới 200.000** hoặc trên 500.000 — dữ liệu claim hiện tại đã hợp lệ
- **134 user bị ban** trong hệ thống

## Phần 1: Reset lệnh rút thưởng

Xóa toàn bộ 41 record trong `reward_claims` để user claim lại từ đầu. Đồng thời reset `reward_status` của user không bị ban về `approved` để họ có thể claim lại.

**Thao tác dữ liệu:**
- `DELETE FROM reward_claims` (toàn bộ 41 record)
- `UPDATE profiles SET reward_status = 'approved' WHERE is_banned = false AND reward_status IN ('claimed', 'pending')`

## Phần 2: Rà soát chặn user bị ban — LỖ HỔNG TÌM THẤY

Đã rà soát toàn bộ Edge Functions. Các function **THIẾU kiểm tra `is_banned`**:

| Edge Function | Chức năng | Rủi ro |
|---|---|---|
| `claim-reward` | Rút thưởng | ✅ Đã có (blockedStatuses) |
| `create-post` | Đăng bài | ✅ Đã có |
| `record-donation` | Tặng quà | ✅ Đã có |
| **`connect-external-wallet`** | Kết nối ví ngoài | ❌ **THIẾU** |
| **`mint-soul-nft`** | Mint NFT | ❌ **THIẾU** |
| **`pplp-submit-action`** | Ghi nhận hành động PPLP | ❌ **THIẾU** |
| **`pplp-score-action`** | Chấm điểm Light | ❌ **THIẾU** |
| **`pplp-evaluate`** | Đánh giá PPLP | ❌ **THIẾU** |
| **`live-token`** | Lấy token livestream | ❌ **THIẾU** |
| **`manual-create-donation`** | Tạo donation thủ công | ❌ **THIẾU** |

## Kế hoạch thực hiện

### A. Dữ liệu (không thay đổi code)
1. Xóa toàn bộ `reward_claims`
2. Reset `reward_status = 'approved'` cho user không bị ban đang ở trạng thái `claimed`/`pending`

### B. Thêm kiểm tra `is_banned` vào 7 Edge Functions
Thêm đoạn code chuẩn vào mỗi function sau khi xác thực user:

```typescript
// Check banned status
const { data: banCheck } = await supabaseAdmin
  .from('profiles').select('is_banned').eq('id', user.id).single();
if (banCheck?.is_banned) {
  return new Response(
    JSON.stringify({ error: 'Tài khoản đã bị cấm vĩnh viễn.' }),
    { status: 403, headers: corsHeaders }
  );
}
```

**Files sửa:**
- `supabase/functions/connect-external-wallet/index.ts`
- `supabase/functions/mint-soul-nft/index.ts`
- `supabase/functions/pplp-submit-action/index.ts`
- `supabase/functions/pplp-score-action/index.ts`
- `supabase/functions/pplp-evaluate/index.ts`
- `supabase/functions/live-token/index.ts`
- `supabase/functions/manual-create-donation/index.ts`

### Tóm tắt
- 2 thao tác dữ liệu (DELETE + UPDATE)
- 7 Edge Functions được vá lỗ hổng bảo mật

