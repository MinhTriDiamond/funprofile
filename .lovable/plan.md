

## Nguyên nhân: Honor Board hiển thị số 0

**Root cause:** Hàm RPC `get_app_stats()` bị lỗi SQL tại dòng 24-25:

```sql
SELECT COALESCE(SUM(amount), 0) INTO v_treasury
FROM reward_claims WHERE status = 'completed';
```

Bảng `reward_claims` **không có cột `status`** — chỉ có 5 cột: `id, user_id, amount, wallet_address, created_at`.

Khi RPC lỗi, frontend nhận error → fallback về giá trị 0 cho tất cả stat items → Honor Board hiển thị toàn số 0.

---

## Kế hoạch sửa

### 1. Sửa hàm `get_app_stats` (Migration SQL)

Bỏ điều kiện `WHERE status = 'completed'`, đổi thành:

```sql
SELECT COALESCE(SUM(amount), 0) INTO v_treasury
FROM reward_claims;
```

Vì bảng `reward_claims` không có cột status — tất cả record đều là claim đã thành công.

### Chỉ cần 1 thay đổi duy nhất

Không cần sửa frontend. File `AppHonorBoard.tsx` đã xử lý đúng — chỉ cần RPC trả về data hợp lệ.

