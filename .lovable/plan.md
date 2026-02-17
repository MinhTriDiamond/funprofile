
# Chỉnh sửa điều kiện hạn chế tài khoản khi tặng/chuyển tiền

## Vấn đề hiện tại
Hệ thống đang chặn các tài khoản có `reward_status` là `on_hold`, `rejected`, `banned` hoặc `is_banned = true`. Theo yêu cầu, chỉ tài khoản có trạng thái `pending` mới bị hạn chế chuyển tiền.

Dữ liệu hiện tại:
- 418 tài khoản: `pending`
- 93 tài khoản: `claimed`
- 37 tài khoản: `on_hold`
- 1 tài khoản: `approved`

Ví dụ: @NgocgiauMoney hiện đang bị chặn vì `reward_status = on_hold`.

## Thay đổi

Sửa điều kiện kiểm tra ở **3 file**, đổi từ:
```typescript
['on_hold', 'rejected', 'banned'].includes(reward_status)
```
thành:
```typescript
reward_status === 'pending'
```

Vẫn giữ nguyên kiểm tra `is_banned = true` (tài khoản bị cấm vĩnh viễn vẫn bị chặn).

### 1. `src/components/donations/UnifiedGiftSendDialog.tsx` (dòng 133-136)
- Đổi điều kiện `isRestricted` thành chỉ chặn khi `is_banned === true` hoặc `reward_status === 'pending'`

### 2. `src/hooks/useSendToken.ts` (dòng 110)
- Đổi điều kiện chặn chuyển token tương tự

### 3. `src/hooks/useDonation.ts` (dòng 89)
- Đổi điều kiện chặn tặng quà tương tự

## Tóm tắt
- Sửa **3 file** frontend
- Tài khoản `pending` -- bị chặn (mới tạo, chưa kích hoạt)
- Tài khoản `on_hold`, `claimed`, `approved` -- được phép tặng/chuyển bình thường
- Tài khoản `is_banned = true` -- vẫn bị chặn
- Không thay đổi database
