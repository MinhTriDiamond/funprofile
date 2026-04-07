

# Đồng bộ Light Actions từ Angel AI sang FUN.RICH

## Vấn đề
Angel AI lưu hoạt động (light_actions) trong DB riêng. FUN.RICH tính FUN Money dựa trên bảng `light_actions` **trong DB của FUN.RICH**. Hiện tại không có endpoint nào để Angel AI đẩy dữ liệu sang → user không thấy số FUN tạo từ Angel AI khi vào FUN.RICH mint.

## Giải pháp: Tạo Edge Function nhận light_actions từ Angel AI

### 1. Tạo Edge Function `pplp-ingest-actions`
- Endpoint để Angel AI gọi khi user thực hiện hoạt động (hỏi Angel, feedback, tạo vision...)
- Xác thực bằng **API key** (service-to-service, không dùng user JWT)
- Nhận payload gồm: `fun_profile_id`, `action_type`, `light_score`, `metadata`, `evidence_hash`
- Ghi vào bảng `light_actions` với `platform_id = 'angel_ai'`
- Chống trùng lặp bằng `evidence_hash` (idempotent)

### 2. Luồng hoạt động

```text
Angel AI (angel.fun.rich)          FUN.RICH (fun.rich)
─────────────────────────          ────────────────────
User hỏi Angel AI
  → Angel AI tính light_score
  → POST /pplp-ingest-actions      → Validate API key
    {                               → Check duplicate (evidence_hash)
      fun_profile_id: "...",        → Insert vào light_actions
      action_type: "QUESTION_ASK",     (platform_id='angel_ai')
      light_score: 50,              → Return success
      evidence_hash: "0x..."
    }
                                    
                                    Epoch Snapshot (hàng tháng)
                                    → Đọc light_actions (tất cả platform)
                                    → Tính mint_allocations
                                    → User thấy FUN để claim
```

### 3. Chi tiết kỹ thuật

**Edge Function `pplp-ingest-actions`:**
- Auth: header `x-api-key` match với secret `ANGEL_AI_INGEST_KEY`
- Validate `fun_profile_id` tồn tại trong bảng `profiles`
- Validate `action_type` nằm trong danh sách cho phép (QUESTION_ASK, FEEDBACK_GIVE, VISION_CREATE)
- Chống duplicate: check `evidence_hash` unique
- Rate limit: tối đa 100 actions/user/ngày từ angel_ai
- Insert vào `light_actions` với `mint_status = 'approved'`, `is_eligible = true`

**Secret cần thêm:**
- `ANGEL_AI_INGEST_KEY`: API key để Angel AI xác thực khi gọi endpoint

### 4. Phía Angel AI cần làm
Sau khi FUN.RICH deploy endpoint, Angel AI cần:
- Gọi `POST https://fun.rich/functions/v1/pplp-ingest-actions` mỗi khi user thực hiện hoạt động
- Gửi kèm header `x-api-key: <ANGEL_AI_INGEST_KEY>`
- Truyền `fun_profile_id` (lấy từ SSO token khi user đã liên kết tài khoản)

## File cần tạo/sửa
| File | Thay đổi |
|------|----------|
| `supabase/functions/pplp-ingest-actions/index.ts` | **Mới** — Edge Function nhận actions từ Angel AI |
| Secret `ANGEL_AI_INGEST_KEY` | **Mới** — API key cho Angel AI |

