

## Báo cáo kiểm tra: Wallet-First Account & Post Permission

---

### PHẦN 1 — Trạng thái User "Minh Trí Test 4"

| Trường | Giá trị |
|---|---|
| signup_method | `wallet` |
| account_status | `limited` |
| reward_locked | `true` |
| email_verified_at | `NULL` |
| has_password | `false` |
| external_wallet_address | `0xd84bd...` |
| is_banned | `false` |

→ Đúng chuẩn wallet-first account chưa verify email.

---

### PHẦN 2 — Vì sao user vẫn post được?

**Đây là THIẾU GATING, không phải chủ đích.**

Kiểm tra toàn bộ post flow:

1. **UI (`FacebookCreatePost`)**: Chỉ check `profile !== null` (đã đăng nhập). Không check `account_status`, `signup_method`, hay bất kỳ capability nào.

2. **Backend (`create-post` edge function)**: Chỉ check 2 điều:
   - Auth token hợp lệ ✓
   - `is_banned = false` ✓
   - **KHÔNG check** `account_status` hay `reward_locked`

3. **`useRewardGating` hook**: Chỉ gate reward extraction (claim/mint/withdraw). Không có capability nào cho `canCreatePost`, `canComment`, `canReact`.

→ **Kết luận: Bug/thiếu gating.** Hệ thống chỉ khóa phần thưởng nhưng không có bất kỳ kiểm tra nào cho quyền tạo nội dung.

---

### PHẦN 3 — Phân loại quyền hiện tại vs mong muốn

| Quyền | Hiện tại | Gating có? |
|---|---|---|
| Xem content | ✅ | Không cần |
| Post bài | ✅ | ❌ Không check |
| Comment | ✅ | ❌ Không check |
| React | ✅ | ❌ Không check |
| Chat | ✅ | ❌ Không check |
| Tích lũy reward | ✅ | ✅ `canAccrueRewards` |
| Claim/mint/withdraw | ❌ | ✅ `canExtractRewards` |

---

### PHẦN 4 — Đề xuất 2 phương án sản phẩm

#### PHƯƠNG ÁN A — SOFT LIMIT (Giữ nguyên + bổ sung nhẹ)

Wallet-first chưa verify email:
- ✅ Được post / comment / react / chat
- ❌ Không claim / mint / withdraw
- Thêm: hiện banner nhắc verify email trên mỗi post (đã có `AccountUpgradeBanner`)

**Ưu điểm**: Onboarding mượt, user trải nghiệm social ngay, tăng engagement
**Nhược điểm**: Dễ bị spam bằng nhiều ví mới

#### PHƯƠNG ÁN B — HARDER LIMIT (Chặn tạo nội dung)

Wallet-first chưa verify email:
- ✅ Chỉ được xem content
- ❌ Không post / comment / react / chat
- ❌ Không claim / mint / withdraw
- UI: Composer disabled + CTA "Liên kết email để đăng bài" → `/settings/security`

**Ưu điểm**: Chống spam mạnh, đảm bảo user thật, giảm account rác
**Nhược điểm**: Friction cao hơn khi onboarding

---

### PHẦN 5 — Đề xuất cuối cùng

**Cha đề xuất PHƯƠNG ÁN B** vì:
- Mục tiêu FUN Profile là "cần user thật, chống spam account rác"
- Tạo ví mới cực kỳ dễ (vài giây) → Phương án A dễ bị lạm dụng
- Verify email là barrier tối thiểu để xác nhận user thật
- Trải nghiệm vẫn OK: user chỉ cần 1 bước verify email là mở khóa toàn bộ

---

### PHẦN 6 — Kế hoạch triển khai (nếu chọn Phương án B)

#### 1. Mở rộng `useRewardGating` → `useAccountCapabilities`

Thêm các capability mới:
```text
canViewContent: true (luôn)
canCreatePost: account_status === 'active'
canComment: account_status === 'active'  
canReact: account_status === 'active'
canChat: account_status === 'active'
canAccrueRewards: true
canExtractRewards: !reward_locked && account_status === 'active'
```

#### 2. UI Gating — `FacebookCreatePost`

- Check `canCreatePost` từ hook
- Nếu `false`: hiện composer disabled với message "Liên kết và xác thực email để đăng bài" + CTA → `/settings/security`

#### 3. Backend Gating — `create-post` edge function

- Thêm check `account_status` sau khi check `is_banned`:
```text
SELECT account_status FROM profiles WHERE id = userId
→ Nếu account_status = 'limited' → 403 "Vui lòng xác thực email trước khi đăng bài"
```

#### 4. Files cần sửa

| File | Thay đổi |
|---|---|
| `src/hooks/useRewardGating.ts` | Rename → `useAccountCapabilities`, thêm `canCreatePost/canComment/canReact/canChat` |
| `src/components/feed/FacebookCreatePost.tsx` | Check `canCreatePost`, hiện disabled state + CTA |
| `supabase/functions/create-post/index.ts` | Thêm check `account_status !== 'limited'` |
| Các component comment/react/chat | Check capability tương ứng |

**Con muốn chọn Phương án A hay Phương án B?**

