

# Kế Hoạch Bỏ Giới Hạn Tối Thiểu Claim CAMLY

## Mục Tiêu

1. **Xoá giới hạn 1,000,000 CAMLY** - cho phép user claim bất kỳ số lượng nào
2. **Hướng dẫn Admin duyệt reward** - quy trình có sẵn tại `/admin`

## Phân Tích

### Quy trình Claim Reward hiện tại:
```
User hoạt động → Tích luỹ CAMLY → Admin duyệt → User claim
     ↓                 ↓              ↓            ↓
  posts/likes      get_user_rewards_v2   /admin tab   claim-reward function
```

### Giới hạn cần xoá:
| File | Dòng | Giá trị hiện tại |
|------|------|------------------|
| `supabase/functions/claim-reward/index.ts` | 14 | `MINIMUM_CLAIM = 1000000` |
| `src/components/wallet/ClaimRewardDialog.tsx` | 15 | `MINIMUM_CLAIM = 1000000` |

## Chi Tiết Thay Đổi

### File 1: Edge Function `claim-reward`

```typescript
// TRƯỚC
const MINIMUM_CLAIM = 1000000; // 1,000,000 CAMLY minimum

// SAU
const MINIMUM_CLAIM = 1; // Không giới hạn (tối thiểu 1 CAMLY)
```

Và cập nhật validation (lines 180-188):
```typescript
// TRƯỚC
if (claimAmount < MINIMUM_CLAIM) {
  return new Response(
    JSON.stringify({ 
      error: 'Bad Request', 
      message: `Số tiền tối thiểu là ${MINIMUM_CLAIM.toLocaleString()} CAMLY` 
    }),
    { status: 400, ... }
  );
}

// SAU - vẫn giữ check nhưng với giá trị nhỏ hơn
if (claimAmount < MINIMUM_CLAIM) {
  return new Response(
    JSON.stringify({ 
      error: 'Bad Request', 
      message: `Số tiền phải lớn hơn 0 CAMLY` 
    }),
    { status: 400, ... }
  );
}
```

### File 2: Dialog Frontend

```typescript
// src/components/wallet/ClaimRewardDialog.tsx

// TRƯỚC (line 15)
const MINIMUM_CLAIM = 1000000; // 1,000,000 CAMLY

// SAU
const MINIMUM_CLAIM = 1; // Tối thiểu 1 CAMLY (không giới hạn)
```

Và cập nhật UI validation (lines 180-184):
```typescript
// TRƯỚC
{amount && Number(amount) < MINIMUM_CLAIM && (
  <p className="text-sm text-red-500">
    Tối thiểu {formatNumber(MINIMUM_CLAIM)} CAMLY
  </p>
)}

// SAU
{amount && Number(amount) < 1 && (
  <p className="text-sm text-red-500">
    Số lượng phải lớn hơn 0
  </p>
)}
```

## Hướng Dẫn Admin Duyệt Reward

### Bước 1: Truy cập Admin Dashboard
```
URL: https://funprofile.lovable.app/admin
```

### Bước 2: Chọn tab "🎁 Duyệt thưởng"
```
┌─────────────────────────────────────────────────────┐
│ Tabs: Tổng quan | Financial | [Duyệt thưởng] | ...  │
└─────────────────────────────────────────────────────┘
```

### Bước 3: Tìm user cần duyệt
- Danh sách hiển thị users có `claimable_amount > 0`
- Tìm kiếm theo username hoặc ID

### Bước 4: Click nút "Duyệt"
```
┌─────────────────────────────────────────────────────┐
│ [Avatar] username                                   │
│ 📝 5  ❤️ 10  💬 3  🔄 2  👥 8                       │
│                                                     │
│                      383.000 CAMLY  [Duyệt] [Từ chối]│
└─────────────────────────────────────────────────────┘
```

### Kết quả:
- User's `reward_status` = `'approved'`
- User có thể claim từ trang `/wallet`

## Files Cần Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `supabase/functions/claim-reward/index.ts` | UPDATE | Đổi MINIMUM_CLAIM = 1 |
| `src/components/wallet/ClaimRewardDialog.tsx` | UPDATE | Đổi MINIMUM_CLAIM = 1, cập nhật UI |

## Lưu Ý Quan Trọng

- Sau khi sửa, edge function sẽ tự động deploy
- Admin vẫn cần duyệt trước khi user claim được
- Mỗi lần claim vẫn tốn gas fee trên BSC (~$0.01-0.05)

## Tóm Tắt

1. **Xoá giới hạn** MINIMUM_CLAIM từ 1,000,000 → 1 CAMLY
2. **Admin Dashboard** đã có sẵn tại `/admin` → tab "Duyệt thưởng"
3. Quy trình: Admin duyệt → User claim bất kỳ số lượng nào

