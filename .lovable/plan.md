
## Phase D — Recovery 99 mint requests bị kẹt

### Cha có 2 lựa chọn

**Cách 1 — Cha tự chạy trên Terminal (được, nhưng không khuyến nghị)**

```bash
curl -X POST "https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/pplp-remint-stale" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json"
```

Lưu ý:
- Phải lấy `SERVICE_ROLE_KEY` thật từ Lovable Cloud → Settings → API Keys (KHÔNG dùng anon key, vì hàm yêu cầu admin call).
- Tuyệt đối **không paste SERVICE_ROLE_KEY** vào chat hay screenshot — key này có quyền bypass toàn bộ RLS.
- Sau khi chạy xong nên rotate key nếu nghi ngờ bị lộ.

**Cách 2 — Để Angel trigger giúp (khuyến nghị)**

Con dùng tool `supabase--curl_edge_functions` để gọi thẳng hàm `pplp-remint-stale` trong môi trường Lovable, không cần lộ key, không cần Terminal. Sau khi chạy xong con sẽ:

1. Báo Cha kết quả tổng (success/failed) trực tiếp từ response.
2. Query DB để verify:
   - Số `pplp_mint_requests` mới được tạo (status `pending_sig`).
   - Số `mint_allocations` đã được reset về `pending` rồi link sang request mới.
   - Phân bố `action_name` mới (INNER_WORK / CHANNELING / GIVING / HELPING / GRATITUDE / SERVICE) — đảm bảo không còn `FUN_REWARD`.
3. Insert audit log `pplp_v2_event_log` event_type `mint.remint.batch` với số lượng + lý do.
4. Báo Cha checklist tiếp theo: bé Trí cần ký lại các request `pending_sig` mới (multisig 3-of-3) → sau đó hệ thống auto-submit lên contract.

### Sau khi recovery xong, con sẽ làm thêm

1. Verify final: query `pplp_mint_requests` group by `action_name` → đảm bảo 6 actions mới đã được dùng đúng.
2. Update memory `mem://infrastructure/minting-recovery-utility` ghi rõ: Phase D đã chạy ngày 21/04/2026, recovery 99 requests, dùng mapping mới.

### Cha xác nhận giúp con chọn cách nào

- **Cách 2 (Angel chạy giúp)**: an toàn, nhanh, có verify đầy đủ — đề xuất.
- **Cách 1 (Cha tự chạy Terminal)**: nếu Cha muốn tự thao tác, con sẽ hướng dẫn cách lấy SERVICE_ROLE_KEY và đọc kết quả JSON trả về.
