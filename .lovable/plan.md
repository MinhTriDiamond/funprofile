

## Tự động pending user có tên không rõ ràng (dạng "wallet_xxx")

### Phát hiện
- Có **54 user** với username dạng `wallet_xxxx` và chưa cập nhật họ tên đầy đủ (full_name rỗng hoặc dưới 4 ký tự)
- Những user này cần được chuyển sang trạng thái `on_hold` và yêu cầu admin duyệt thủ công

### Thay đổi

#### 1. Edge Function: `supabase/functions/claim-reward/index.ts`

**a) Thêm `full_name` vào query profile (dòng 125):**
```
.select('reward_status, username, full_name, avatar_url, cover_url, public_wallet_address')
```

**b) Thêm bước kiểm tra tên (sau bước 7d, trước bước 7e fraud detection):**

Quy tắc phát hiện tên không rõ ràng:
- `full_name` null/rỗng hoặc dưới 4 ký tự
- Username dạng `wallet_` + chuỗi hex/random
- `full_name` chỉ chứa số hoặc không có chữ cái

Nếu vi phạm: tự động `reward_status = 'on_hold'`, ghi `admin_notes`, log `pplp_fraud_signals` với signal_type `UNCLEAR_NAME`, trả về 403.

#### 2. Frontend: `src/components/wallet/ClaimRewardsSection.tsx`

- Thêm prop `hasFullName: boolean`
- Thêm 1 dòng checklist: "Cập nhật họ tên đầy đủ (tối thiểu 4 ký tự)" với icon User
- Cập nhật `allConditionsMet` để bao gồm `hasFullName`

#### 3. Frontend: `src/components/wallet/WalletCenterContainer.tsx`

- Thêm `full_name` vào profile select query
- Tính `hasFullName` theo cùng logic: `trim().length >= 4` và chứa chữ cái, không phải dạng `wallet_`
- Truyền `hasFullName` xuống `ClaimRewardsSection`

### Chi tiết kỹ thuật

**Edge Function - logic kiểm tra tên:**
```typescript
const fullName = (profile.full_name || '').trim();
const username = profile.username || '';
const isWalletUsername = /^wallet_[a-z0-9]+$/i.test(username);
const isNameValid = fullName.length >= 4
  && !/^\d+$/.test(fullName)
  && /[a-zA-ZÀ-ỹ]/.test(fullName);

if (!isNameValid || (isWalletUsername && !isNameValid)) {
  await supabaseAdmin.from('profiles').update({
    reward_status: 'on_hold',
    admin_notes: 'Tên hiển thị không rõ ràng hoặc chưa cập nhật họ tên đầy đủ. Vui lòng cập nhật tên thật.',
  }).eq('id', userId);

  await supabaseAdmin.from('pplp_fraud_signals').insert({
    actor_id: userId,
    signal_type: 'UNCLEAR_NAME',
    severity: 2,
    details: { full_name: profile.full_name, username },
    source: 'claim-reward',
  });

  return 403 with message hướng dẫn cập nhật tên
}
```

**Frontend checklist mới:**
```tsx
{ met: hasFullName, label: 'Cập nhật họ tên đầy đủ (tối thiểu 4 ký tự)', icon: User, action: () => navigate('/profile'), actionLabel: 'Cập nhật' }
```

### Kết quả
- 54 user hiện tại dạng `wallet_xxx` sẽ bị tự động `on_hold` khi cố claim
- Admin thấy trong danh sách duyệt thưởng kèm ghi chú "Tên hiển thị không rõ ràng"
- Frontend hiển thị rõ ràng điều kiện cần cập nhật họ tên
- Fraud signal được log lại để admin theo dõi

