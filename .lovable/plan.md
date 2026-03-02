

# Sửa số liệu FUN cho user hongthienhanh68

## Vấn đề
Mint request `7631dfd3-2464-4636-a7af-f63a4d2a9653` đang hiển thị sai:
- **Hiện tại**: 655 FUN (`amount_wei: 655000000000000000000`)
- **Thực tế** (tính từ 791 light_actions): **4,299 FUN**

## Giải pháp
Cập nhật trực tiếp record trong bảng `pplp_mint_requests`:

```text
UPDATE pplp_mint_requests 
SET 
  amount_display = 4299,
  amount_wei = '4299000000000000000000',
  updated_at = now()
WHERE id = '7631dfd3-2464-4636-a7af-f63a4d2a9653' 
  AND status = 'pending_sig'
```

Không cần thay đổi code hay schema -- chỉ cần sửa dữ liệu.

