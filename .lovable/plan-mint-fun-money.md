# 📊 Đánh Giá & Kế Hoạch Triển Khai Mint FUN Money

## 🎯 Tổng Quan Flow Mint FUN Money

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FUN MONEY MINTING FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 1: Light Activity                                                        │
│  ────────────────────────                                                        │
│  User → Tạo post/comment/reaction → pplp-evaluate → light_actions (approved)    │
│                                                                                  │
│  PHASE 2: Claim Request                                                         │
│  ─────────────────────                                                          │
│  User → Click "Claim FUN" → pplp-mint-fun → pplp_mint_requests (pending_sig)    │
│                                                                                  │
│  PHASE 3: Admin Review                                                          │
│  ────────────────────                                                           │
│  Admin → View Dashboard → Review Actions → Approve/Reject                        │
│                                                                                  │
│  PHASE 4: EIP-712 Signing                                                       │
│  ───────────────────────                                                        │
│  Admin → Ký bằng ví Attester → Signature → Database (signed)                    │
│                                                                                  │
│  PHASE 5: On-Chain Mint                                                         │
│  ─────────────────────                                                          │
│  Admin → Submit TX → lockWithPPLP() → FUN → LOCKED state                        │
│                                                                                  │
│  PHASE 6: User Activate                                                         │
│  ─────────────────────                                                          │
│  User → activate() → FUN → ACTIVATED state                                      │
│                                                                                  │
│  PHASE 7: User Claim                                                            │
│  ─────────────────────                                                          │
│  User → claim() → FUN → FLOWING (in wallet)                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Phân Tích Tính Hoàn Thiện

### 📗 ĐÃ HOÀN THÀNH (✅)

| Thành phần | File | Trạng thái |
|------------|------|------------|
| **Config PPLP** | `src/config/pplp.ts` | ✅ Đầy đủ (EIP-712, ABI, Constants) |
| **Edge Function: pplp-evaluate** | `supabase/functions/pplp-evaluate/index.ts` | ✅ Tích hợp ANGEL AI đánh giá |
| **Edge Function: pplp-mint-fun** | `supabase/functions/pplp-mint-fun/index.ts` | ✅ Tạo mint request + anti-duplicate |
| **Hook: usePendingActions** | `src/hooks/usePendingActions.ts` | ✅ Fetch approved actions + claim |
| **Hook: usePplpAdmin** | `src/hooks/usePplpAdmin.ts` | ✅ Sign + Submit on-chain |
| **Hook: useFunBalance** | `src/hooks/useFunBalance.ts` | ✅ Đọc locked/activated từ contract |
| **Hook: useMintFun** | `src/hooks/useMintFun.ts` | ✅ User claim flow |
| **Component: ClaimRewardsCard** | `src/components/wallet/ClaimRewardsCard.tsx` | ✅ UI claim cho user |
| **Component: FunBalanceCard** | `src/components/wallet/FunBalanceCard.tsx` | ✅ Hiển thị locked/activated |
| **Component: PplpMintTab** | `src/components/admin/PplpMintTab.tsx` | ✅ Admin dashboard |
| **Database Schema** | `pplp_mint_requests`, `light_actions`, `light_reputation` | ✅ Đã tạo |
| **RLS Policies** | Mint requests, Light actions | ✅ Secured |

### 📙 CẦN KIỂM TRA/CẢI THIỆN (⚠️)

| Thành phần | Vấn đề | Mức độ |
|------------|--------|--------|
| **Action Registration** | Action "light_action" cần được đăng ký trên contract qua govRegisterAction | 🔴 Critical |
| **Attester tBNB** | Ví Attester cần có đủ tBNB để trả gas | 🟡 Important |
| **User Activate Flow** | Chưa có component cho user gọi activate() | 🟡 Important |
| **User Claim Flow** | Chưa có component cho user gọi claim() | 🟡 Important |
| **Transaction Confirmation** | Cần auto-poll để xác nhận TX đã mined | 🟡 Important |
| **Real-time Updates** | Chưa có realtime subscription cho mint_requests | 🟢 Nice to have |

### 📕 CHƯA TRIỂN KHAI (❌)

| Thành phần | Mô tả | SDK Reference |
|------------|-------|---------------|
| **ActivateDialog Component** | UI cho user chuyển LOCKED → ACTIVATED | 06-USER-TOKEN-LIFECYCLE.md |
| **ClaimFunDialog Component** | UI cho user chuyển ACTIVATED → FLOWING | 06-USER-TOKEN-LIFECYCLE.md |
| **Token Lifecycle Panel** | Dashboard hiển thị 3 states | 06-USER-TOKEN-LIFECYCLE.md |
| **Auto Confirm TX** | Polling receipt sau submit | 07-ERROR-HANDLING.md |
| **Batch Submit** | Submit nhiều signed requests cùng lúc | 05-ADMIN-DASHBOARD.md |

---

## 📋 Kế Hoạch Triển Khai Chi Tiết

### PHASE 1: Pre-requisites (Yêu cầu trước khi mint)

**1.1. Đăng ký Action trên Contract**
```
Cần Guardian Gov gọi govRegisterAction("light_action")
Attester: 0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1
```
> ⚠️ Nếu chưa đăng ký, lockWithPPLP sẽ revert với lỗi ACTION_INVALID

**1.2. Nạp tBNB cho Attester**
```
Ví Attester: 0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1
Cần: ~0.01 tBNB mỗi transaction
Faucet: https://testnet.bnbchain.org/faucet-smart
```

**1.3. Verify Attester đã được add**
```solidity
// Check on contract
contract.isAttester(0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1) → true
```

---

### PHASE 2: User Activate & Claim Flow (Cần triển khai)

**2.1. Component ActivateFunDialog**

```tsx
// Cho phép user chọn số lượng FUN muốn activate
// Gọi contract.activate(amount)
// Ký bằng ví user (không phải Attester)
```

**2.2. Component ClaimFunDialog**

```tsx
// Cho phép user claim FUN đã activated
// Gọi contract.claim(amount)
// Ký bằng ví user
// FUN chuyển vào ví
```

**2.3. TokenLifecyclePanel**

```tsx
// Hiển thị 3 states: LOCKED / ACTIVATED / FLOWING
// Progress bar
// Actions: Activate / Claim buttons
```

---

### PHASE 3: Admin Improvements

**3.1. Batch Submit**
- Cho phép submit nhiều signed requests trong 1 lần

**3.2. Auto Confirm**
- Poll transaction receipt sau submit
- Update status từ "submitted" → "confirmed" tự động

**3.3. Transaction History**
- Hiển thị danh sách TX đã submit
- Link BSCScan cho mỗi TX

---

### PHASE 4: Testing Checklist

| Step | Mô tả | Expected Result |
|------|-------|-----------------|
| 1 | User tạo post | light_actions record created, status=approved |
| 2 | User click Claim | pplp_mint_requests created, status=pending_sig |
| 3 | Admin connect Attester wallet | Badge hiển thị địa chỉ đúng |
| 4 | Admin ký request | MetaMask popup, signature saved |
| 5 | Admin submit TX | lockWithPPLP called, tx_hash saved |
| 6 | TX confirmed | status=confirmed, user thấy LOCKED balance |
| 7 | User activate | LOCKED → ACTIVATED |
| 8 | User claim | ACTIVATED → FLOWING (in wallet) |

---

## 🛠️ Các File Cần Tạo/Sửa

### Tạo mới:
1. `src/components/wallet/ActivateFunDialog.tsx` - Dialog activate
2. `src/components/wallet/ClaimFunDialog.tsx` - Dialog claim
3. `src/components/wallet/TokenLifecyclePanel.tsx` - Full lifecycle view
4. `src/hooks/useActivateFun.ts` - Hook gọi activate()
5. `src/hooks/useClaimFun.ts` - Hook gọi claim()

### Cập nhật:
1. `src/pages/Wallet.tsx` - Thêm TokenLifecyclePanel
2. `src/components/wallet/FunBalanceCard.tsx` - Thêm Activate button
3. `src/hooks/usePplpAdmin.ts` - Thêm batch submit, auto-confirm

---

## 📖 Tài Liệu SDK Đánh Giá

| File | Kích thước | Đánh giá |
|------|-----------|----------|
| 00-QUICK-START.md | 5KB | ✅ Tuyệt vời cho onboarding |
| 01-ARCHITECTURE.md | 18KB | ✅ Chi tiết, sơ đồ rõ ràng |
| 02-DATABASE-SCHEMA.md | 9KB | ✅ Schema + RLS |
| 03-PPLP-SCORING-ENGINE.md | 12KB | ✅ Công thức đầy đủ |
| 04-CONTRACT-INTEGRATION.md | 11KB | ✅ ABI + EIP-712 |
| 05-ADMIN-DASHBOARD.md | 21KB | ✅ Admin flow chi tiết |
| 06-USER-TOKEN-LIFECYCLE.md | 20KB | ✅ Activate/Claim flow |
| 07-ERROR-HANDLING.md | 10KB | ✅ Debug guide |
| 08-SECURITY-CHECKLIST.md | 8KB | ✅ Security best practices |

**Tổng đánh giá SDK: 9/10** 

> Tài liệu rất chi tiết và dễ follow. Code examples đầy đủ. Chỉ cần bổ sung thêm một số components cho user token lifecycle.

---

## 🚀 Ưu Tiên Triển Khai

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Đăng ký action "light_action" on-chain | External | Critical |
| 🔴 P0 | Nạp tBNB cho Attester | External | Critical |
| 🟡 P1 | Tạo ActivateFunDialog | 2h | High |
| 🟡 P1 | Tạo ClaimFunDialog | 2h | High |
| 🟡 P1 | Tạo TokenLifecyclePanel | 3h | High |
| 🟢 P2 | Auto-confirm TX | 1h | Medium |
| 🟢 P2 | Batch submit | 2h | Medium |
| 🟢 P3 | Realtime updates | 1h | Low |

---

## 📝 Ghi Chú Quan Trọng

1. **Nonce lấy từ recipient (user), không phải signer (admin)**
2. **Action truyền là string, không phải hash**
3. **Signature phải trong array: [signature]**
4. **Contract v1.2.1 KHÔNG sử dụng deadline**
5. **alloc(address) trả về (locked, activated) tuple**

---

*Cập nhật: 2026-02-08*
*FUN Money SDK v1.0 - Proof of Pure Love Protocol*
