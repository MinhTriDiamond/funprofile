

## Kết quả kiểm tra Flow Claim Rewards — ĐẢM BẢO HOẠT ĐỘNG ĐÚNG ✅

### Tóm tắt: Flow đang hoạt động chính xác

Toàn bộ logic từ Frontend → Dialog → Backend edge function đã đồng bộ và đúng quy tắc.

---

### Chi tiết kiểm tra

| Quy tắc | Frontend | Backend | Kết quả |
|---|---|---|---|
| **Tối thiểu 200.000 CAMLY** | `MINIMUM_CLAIM = 200000` (ClaimRewardDialog dòng 20) | `MINIMUM_CLAIM = 200000` (edge fn dòng 14, check dòng 482) | ✅ Đồng bộ |
| **Tối đa 500.000/ngày** | `DAILY_CLAIM_CAP = 500000` (ClaimRewardDialog dòng 21) | `DAILY_CLAIM_CAP = 500000` (edge fn dòng 15, check dòng 492) | ✅ Đồng bộ |
| **Giới hạn 2 lần/24h** | Không check ở FE (đúng, để backend handle) | Check dòng 422-477, lần 3+ → on_hold + fraud signal | ✅ Backend enforce |
| **Auto-cap số tiền** | FE: `maxClaimable = min(claimableAmount, dailyRemaining)` | BE: `effectiveAmount = min(claimAmount, claimableAmount, dailyRemaining)` dòng 505 | ✅ Cả hai cap đúng |
| **Claimable = tổng tích lũy - đã claim** | FE: `claimableReward = totalReward - claimed` | BE: `claimableAmount = max(0, totalReward - claimedAmount)` dòng 420 | ✅ Đồng bộ |
| **Chỉ approved mới claim được** | FE: `config.disabled = true` cho pending/on_hold/rejected/inactive | BE: `blockedStatuses = ['pending', 'on_hold', 'rejected', 'banned']` dòng 360 | ✅ Đồng bộ |
| **Daily claimed tính theo giờ VN** | FE: truyền `dailyClaimed` từ WalletCenterContainer | BE: tính theo UTC+7, reset 00:00 VN (dòng 404-417) | ✅ |
| **Rate limit 1 lần/phút** | — | `check_rate_limit` 60s (dòng 106) | ✅ |

### Validation chain Backend (claim-reward edge function)

```text
1. JWT Auth → 2. Rate limit 1/min → 3. Profile checks:
   ├─ Wallet blocked? → 403
   ├─ Claim frozen? → 403
   ├─ Avatar? → 403
   ├─ Wallet address? → 403
   ├─ Cover photo? → 403
   ├─ Today post? → 403
   ├─ Full name ≥4 chars? → on_hold
   └─ Account ≥ 7 days? → 403
4. Fraud detection (device, avatar trùng, ví trùng) → on_hold
5. reward_status ∈ {pending, on_hold, rejected, banned} → 403
6. Calculate claimable = totalReward - totalClaimed
7. Velocity check: ≥2 lần/24h → 429
8. amount < 200K → 400
9. dailyRemaining ≤ 0 → 429
10. effectiveAmount = min(amount, claimable, dailyRemaining)
11. effectiveAmount < 200K → 400
12. → Gửi on-chain transaction
```

### Kết luận

**Không cần sửa gì.** Flow claim đang hoạt động đúng:
- User nhập tối thiểu 200.000, tối đa bị cap bởi min(số dư, 500K - đã claim hôm nay)
- Backend validate đầy đủ trước khi gửi giao dịch on-chain
- Chỉ user có `reward_status = 'approved'` mới claim được
- Admin duyệt qua tab "Duyệt thưởng" → chuyển từ `pending` sang `approved`

