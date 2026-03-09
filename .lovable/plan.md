

## Vấn đề phát hiện

Father (`0xf6DBe280EC7E9262364c41cc6Cf90c956b7eD47D`) là user Fun Profile, đang tặng token on-chain trực tiếp (không qua Gift Dialog) cho nhiều user khác. Hiện tại **0 donations** được ghi nhận vì:

1. **`record-donation`** chỉ chạy khi user dùng Gift Dialog trong app
2. **`scan-my-incoming`** (user tự quét) **loại bỏ** transfers từ ví Fun Profile (dòng 128: `if (funProfileWallets.has(from)) return false`)
3. **`detect-incoming-transfers`** chỉ admin dùng được, phải nhập sender_address thủ công

### Giải pháp

Sửa `scan-my-incoming` để **không loại bỏ** transfers từ Fun Profile users. Thay vào đó, khi sender là Fun Profile user → gán đúng `sender_id` + link profile. Chỉ bỏ qua nếu `tx_hash` đã tồn tại trong `donations`.

### Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `supabase/functions/scan-my-incoming/index.ts` | Bỏ filter loại trừ Fun Profile senders. Thêm logic map `sender_address` → `sender_id` khi sender là Fun Profile user. Set `is_external: false` cho internal transfers. |
| `src/components/wallet/DonationHistoryItem.tsx` | Đảm bảo hiển thị đúng tên sender cho cả internal lẫn external donations |

### Flow mới

```text
User nhấn "Quét ví ngoài"
  → Lấy TẤT CẢ ERC20 transfers đến ví user
  → Lọc token đã biết (CAMLY, USDT, BTCB, FUN)
  → Bỏ các tx_hash đã có trong donations
  → Nếu sender = Fun Profile user → sender_id = profile.id, is_external = false
  → Nếu sender = ví ngoài → sender_id = null, is_external = true
  → Insert vào donations
```

### Không thay đổi
- Database schema
- RLS policies
- `detect-incoming-transfers` (admin tool vẫn giữ nguyên)
- `record-donation` (Gift Dialog flow vẫn giữ nguyên)

