

## Nguyên nhân: Fraud detection chạy TRƯỚC kiểm tra `reward_status`, đặt lại user về `on_hold` mỗi lần claim

### Vấn đề cụ thể

Trong `claim-reward/index.ts`, thứ tự thực thi là:

```text
Dòng 253-358: Fraud detection (device, avatar, wallet trùng)
  → Nếu phát hiện → ĐẶT reward_status = 'on_hold' → RETURN 403
Dòng 360-375: Kiểm tra reward_status ∈ {pending, on_hold, rejected, banned}
```

**User b7856e97** đã được admin duyệt (`approved`), nhưng thiết bị đang dùng chung bởi 2 tài khoản. Khi claim:
1. Fraud detection phát hiện shared device → **đặt lại `reward_status = 'on_hold'`** → return 403
2. Admin duyệt lại → user claim → fraud detection lại đặt `on_hold` → **vòng lặp vô tận**

### Giải pháp

**Bỏ qua fraud detection nếu user đã được admin duyệt (`reward_status = 'approved'`)**. Lý do: Admin đã xác minh rồi, không cần hệ thống tự động ghi đè quyết định của admin.

### Thay đổi cụ thể

**File: `supabase/functions/claim-reward/index.ts`**

Tại dòng 253 (trước fraud detection block), thêm điều kiện skip:

```typescript
// 7f. Auto fraud detection - BỎ QUA nếu admin đã duyệt (approved)
// Admin đã xác minh → không ghi đè quyết định admin
if (profile.reward_status !== 'approved') {
  // ... toàn bộ fraud detection logic (dòng 256-358)
}
```

Cụ thể: Wrap toàn bộ block fraud detection (dòng 256-358) trong `if (profile.reward_status !== 'approved')`.

Phần kiểm tra `blockedStatuses` ở dòng 360-375 vẫn giữ nguyên — nếu user chưa `approved` và không bị fraud thì vẫn bị chặn bởi `pending`.

### Tổng kết

- Sửa 1 file: `supabase/functions/claim-reward/index.ts`
- Thêm 1 điều kiện `if` bọc fraud detection block
- Không thay đổi logic validate khác (daily cap, min 200K, rate limit, profile checks)

