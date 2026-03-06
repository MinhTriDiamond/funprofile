

## Kiểm tra Flow Claim — Phát hiện lỗi Frontend/Backend không đồng bộ

### Vấn đề phát hiện

**Frontend** (`WalletCenterContainer.tsx` dòng 270):
```js
setClaimableReward(Math.max(0, totalReward - claimed));
// Hiển thị TỔNG tích lũy trừ TỔNG đã claim → con số rất lớn
```

**Backend** (`claim-reward/index.ts` dòng 420):
```js
const claimableAmount = Math.max(0, todayReward - todayClaimed);
// Chỉ cho phép claim phần thưởng HÔM NAY trừ đã claim HÔM NAY → con số nhỏ hơn nhiều
```

**Hệ quả**: User thấy "Có thể Claim: 5.000.000 CAMLY" trên giao diện, nhập 500.000 để claim, nhưng backend từ chối vì `todayReward` chỉ có 50.000.  
→ User thấy lỗi "Số dư khả dụng chưa đủ 200.000 CAMLY" dù UI hiện số dư rất cao.  
→ **User không bao giờ claim được** nếu `todayReward < 200.000`.

### Giải pháp

Cần thống nhất logic. Có 2 hướng:

**Hướng A (Khuyến nghị): Sửa backend cho phép claim từ tổng tích lũy**
- Đổi dòng 420 backend thành: `const claimableAmount = Math.max(0, totalReward - claimedAmount);`
- Giữ nguyên giới hạn 500K/ngày và 2 lần/24h
- Frontend đã đúng, không cần sửa
- **Ưu điểm**: User tích lũy nhiều ngày có thể rút dần, phù hợp logic "phần thưởng tích lũy"

**Hướng B: Sửa frontend hiển thị đúng theo backend**
- Thêm `today_reward` vào frontend
- `setClaimableReward(Math.max(0, todayReward - todayClaimed))`
- **Nhược điểm**: User chỉ claim được thưởng hôm nay, thưởng cũ bị mất → không hợp lý

### Thay đổi cụ thể (Hướng A)

**File: `supabase/functions/claim-reward/index.ts`** (dòng 419-420)
- Thay: `const claimableAmount = Math.max(0, todayReward - todayClaimed);`
- Bằng: `const claimableAmount = Math.max(0, totalReward - claimedAmount);`
- Giữ nguyên toàn bộ validation còn lại (daily cap, velocity check, fraud detection...)

### Các điểm đã kiểm tra và đảm bảo hoạt động đúng

| Kiểm tra | Kết quả |
|---|---|
| Nút "Yêu cầu duyệt" (inactive → pending) | ✅ Validate 6 điều kiện trước khi gửi |
| Nút Claim chỉ bật khi approved | ✅ `config.disabled` chặn đúng |
| Wallet security (freeze/block) | ✅ Chặn cả frontend lẫn backend |
| Rate limit (1/phút) | ✅ Backend check |
| Velocity (2 lần/24h) | ✅ Backend check + auto on_hold |
| Daily cap 500K | ✅ Backend check |
| Min 200K | ✅ Cả frontend + backend |
| Profile checks (avatar, cover, name, post, ví, 7 ngày) | ✅ Backend validate đầy đủ |
| Fraud detection (device, avatar trùng, ví trùng) | ✅ Backend check |
| Bảng điều kiện 9 mục | ✅ Frontend hiển thị đúng |
| ClaimRewardDialog mở đúng | ✅ Truyền đủ props |

**Tổng: Sửa 1 dòng trong edge function `claim-reward`.**

