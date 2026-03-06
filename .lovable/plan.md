

## Phân tích nguyên nhân

### Vấn đề cốt lõi

Hiện tại, flow claim hoạt động như sau:

```text
Admin duyệt USER (reward_status → 'approved')
    ↓
User bấm Claim → Edge function gửi token ON-CHAIN NGAY LẬP TỨC
    ↓
Giao dịch hoàn thành → Không cần admin duyệt từng lệnh claim
```

**Đây là thiết kế hiện tại**: Khi admin đã duyệt tài khoản (`approved`), user tự do claim mà KHÔNG cần admin duyệt từng lần. Admin không thấy lệnh claim trong tab "Duyệt thưởng" vì tab đó chỉ hiển thị user có `reward_status = 'pending'`.

### Tại sao admin không thấy lệnh claim?

- Tab "Duyệt thưởng" lọc: `reward_status === 'pending'` (dòng 169 RewardApprovalTab)
- User đã được duyệt (`approved`) → claim trực tiếp → edge function gửi token on-chain ngay
- Sau khi claim xong, edge function đặt `reward_status = 'claimed'` (dòng 683-685)
- Không có bước trung gian nào để admin xem/duyệt từng lệnh claim

### Giải pháp đề xuất

Thay đổi flow để **mỗi lần claim cần admin duyệt** (2-step approval):

```text
FLOW MỚI:
User bấm Claim → Tạo bản ghi "pending_claim" trong DB → Admin thấy trong tab duyệt
    ↓
Admin duyệt → Edge function gửi token on-chain
Admin từ chối → Hoàn lại số dư, thông báo user
```

### Chi tiết thay đổi

**1. Tạo bảng `pending_claims` (migration SQL)**

```sql
CREATE TABLE public.pending_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  admin_id UUID REFERENCES profiles(id),
  admin_note TEXT,
  tx_hash TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pending_claims ENABLE ROW LEVEL SECURITY;

-- User có thể xem claim của mình
CREATE POLICY "Users can view own claims" ON public.pending_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- User có thể tạo claim mới
CREATE POLICY "Users can insert own claims" ON public.pending_claims
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin có thể xem và cập nhật tất cả
CREATE POLICY "Admins can view all claims" ON public.pending_claims
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update claims" ON public.pending_claims
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

**2. Sửa `claim-reward` edge function** — Thay vì gửi on-chain ngay, chỉ tạo bản ghi `pending_claims` với `status = 'pending'` và trả về thông báo "Lệnh claim đã được gửi, chờ Admin duyệt".

**3. Tạo edge function mới `approve-claim`** — Admin gọi function này để duyệt. Function sẽ:
- Kiểm tra admin role
- Lấy pending_claim → gửi token on-chain
- Cập nhật `pending_claims.status = 'completed'` + ghi `tx_hash`
- Ghi vào `reward_claims`, `transactions`, `donations` như cũ
- Thông báo user

**4. Sửa `RewardApprovalTab`** — Thêm section hiển thị danh sách `pending_claims` với nút Duyệt/Từ chối cho từng lệnh claim.

**5. Sửa `ClaimRewardDialog`** — Thay đổi UI success từ "Giao dịch hoàn thành" sang "Lệnh claim đã được gửi, chờ Admin duyệt ⏳". Hiển thị trạng thái pending.

**6. Sửa `useClaimReward` hook** — Cập nhật response handling cho flow mới (không còn nhận `tx_hash` ngay).

### Tổng kết

| Thay đổi | File |
|---|---|
| Tạo bảng `pending_claims` | Migration SQL |
| Sửa edge function claim → chỉ tạo pending | `supabase/functions/claim-reward/index.ts` |
| Tạo edge function admin duyệt claim | `supabase/functions/approve-claim/index.ts` |
| Cập nhật UI admin hiển thị pending claims | `src/components/admin/RewardApprovalTab.tsx` |
| Cập nhật dialog claim → hiện trạng thái chờ | `src/components/wallet/ClaimRewardDialog.tsx` |
| Cập nhật hook claim | `src/hooks/useClaimReward.ts` |

