

# Sửa toàn bộ vấn đề hệ thống Mint FUN Money

## Tổng quan

Có 5 vấn đề cần sửa, chia thành 3 nhóm ưu tiên.

## Thay đổi chi tiết

### 1. Cập nhật `admin-batch-mint-requests/index.ts` — dùng `mint_allocations` thay vì `light_actions.mint_amount`

**Vấn đề**: `mint_amount` trong `light_actions` luôn = 0 (epoch flow), nên batch mint skip tất cả users.

**Giải pháp**: Chuyển sang query `mint_allocations` với `status = 'pending'` thay vì `light_actions`. Mỗi allocation đã chứa sẵn `allocation_amount_capped`, `user_id`, và danh sách action liên quan.

- Thay `fetchAllEligibleActions()` bằng `fetchPendingAllocations()` — query bảng `mint_allocations` join `mint_epochs` 
- Tạo mint request cho mỗi allocation thay vì group theo light_actions
- Cập nhật allocation status → `claimed` sau khi tạo request
- Giữ nguyên logic: skip banned users, skip no wallet, nonce từ contract

### 2. Cập nhật `admin-merge-mint-requests/index.ts` — dùng `amount_display` đã lưu

**Vấn đề**: `getActualAmountFromActions()` query `mint_amount` từ `light_actions` → luôn = 0 → skip.

**Giải pháp**: Thay vì query lại `light_actions`, dùng trực tiếp `amount_display` đã lưu trong `pplp_mint_requests` (giá trị này đã đúng từ lúc tạo request qua epoch flow).

- Xóa hàm `getActualAmountFromActions()`
- Tính `totalDisplay = requests.reduce(sum + r.amount_display)` từ chính các requests đang merge
- Đối với single request: không cần recalculate vì amount_display đã chính xác

### 3. Đồng bộ `recalculate-fun-amounts/index.ts` — cập nhật BASE_REWARDS

**Vấn đề**: `NEW_BASE_REWARDS` dùng giá trị cũ (post=5) trong khi `pplp-evaluate` dùng giá trị mới (post=50). Chạy recalculate sẽ giảm 10x light score.

**Giải pháp**: 
- Cập nhật `NEW_BASE_REWARDS` cho khớp: post=50, comment=10, reaction=10, share=10, friend=20, livestream=200, new_user_bonus=500
- Thêm note rằng đây đã là epoch-based, `mint_amount` = 0

### 4. Deprecate `useMintFun.ts` — đánh dấu legacy

**Vấn đề**: Gửi `action_ids` nhưng backend chỉ nhận `allocation_id` → luôn lỗi.

**Giải pháp**: 
- Thêm comment `@deprecated` rõ ràng ở đầu file
- Thêm `console.warn` trong `mintPendingActions` hướng dẫn dùng `useEpochAllocation().claim()` thay thế
- Giữ file để không break import cũ, nhưng function sẽ warn

### 5. Deprecate `pplp-authorize-mint/index.ts`

**Vấn đề**: Tham chiếu bảng `pplp_actions` + `pplp_scores` (legacy, không còn dùng).

**Giải pháp**: Thêm deprecation notice ở đầu file. Nếu được gọi, trả về lỗi 410 Gone với thông báo chuyển sang epoch flow.

## File cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/admin-batch-mint-requests/index.ts` | Chuyển sang dùng `mint_allocations` |
| `supabase/functions/admin-merge-mint-requests/index.ts` | Dùng `amount_display` từ requests, xóa `getActualAmountFromActions` |
| `supabase/functions/recalculate-fun-amounts/index.ts` | Đồng bộ BASE_REWARDS: post=50, comment=10, etc. |
| `src/hooks/useMintFun.ts` | Đánh dấu `@deprecated`, thêm warning |
| `supabase/functions/pplp-authorize-mint/index.ts` | Trả 410 Gone, deprecate |

