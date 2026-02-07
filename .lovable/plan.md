
# Kế Hoạch Sửa Lỗi: Auto-Link Wallet & Gift Notification

## Phân Tích Vấn Đề

### Thống Kê Hiện Tại
| Tổng Users | Có Wallet | Không có Wallet |
|------------|-----------|-----------------|
| 298 | 207 (69%) | 91 (31%) |

### Nguyên Nhân
1. **Profile.tsx không lấy wallet address cho người khác**: Query lấy profile người khác (line 141) không include `external_wallet_address`, `custodial_wallet_address`
2. **DonationButton trong Profile chỉ dùng external_wallet**: Line 498 chỉ dùng `external_wallet_address`, không fallback sang `custodial_wallet_address`
3. **91 users cũ không có custodial wallet**: Họ đăng ký trước khi hệ thống auto-create

---

## Giải Pháp Chi Tiết

### Phần 1: Fix Profile.tsx

**File**: `src/pages/Profile.tsx`

1. **Thêm wallet fields vào query** (line 141):
```typescript
// Trước
'id, username, avatar_url, full_name, bio, cover_url, created_at, soul_level, total_rewards, pinned_post_id'

// Sau
'id, username, avatar_url, full_name, bio, cover_url, created_at, soul_level, total_rewards, pinned_post_id, external_wallet_address, custodial_wallet_address'
```

2. **Fix DonationButton fallback** (line 498):
```typescript
// Trước
recipientWalletAddress={profile.external_wallet_address}

// Sau
recipientWalletAddress={profile.external_wallet_address || profile.custodial_wallet_address}
```

---

### Phần 2: Thông Báo Khi User Chưa Có Ví

**File**: `src/components/donations/DonationDialog.tsx`

Thêm nút "Gửi Nhắc Nhở" khi người nhận chưa có ví, gọi Edge Function để:
1. Tạo conversation nếu chưa có
2. Gửi tin nhắn thông báo với nội dung:
   ```
   🎁 [Sender Username] muốn tặng quà cho bạn!
   Bạn hãy kết nối ví Web3 để sẵn sàng nhận quà nhé!
   ```

---

### Phần 3: Edge Function - Notify Gift Ready

**File mới**: `supabase/functions/notify-gift-ready/index.ts`

Xử lý 2 trường hợp:
1. **User chưa có ví**: Gửi tin nhắn nhắc kết nối ví
2. **Ví đã link với tài khoản khác**: Gửi tin nhắn gợi ý dùng ví khác

Nội dung tin nhắn (theo yêu cầu):
```
[Tên user muốn tặng] muốn tặng quà cho bạn.
Ví hiện tại của bạn đã kết nối với một tài khoản khác, bạn hãy kết nối với một địa chỉ ví khác để sẵn sàng nhận quà nhé!
```

---

### Phần 4: Cải Tiến DonationDialog

**File**: `src/components/donations/DonationDialog.tsx`

Thay đổi UI khi người nhận chưa có ví:
- Hiển thị nút "Gửi Nhắc Nhở" thay vì "Gửi Tặng"
- Loading state khi đang gửi thông báo
- Toast success/error

---

## Files Cần Thay Đổi

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/pages/Profile.tsx` | Thêm wallet fields vào query + fix fallback |
| 2 | `src/components/donations/DonationDialog.tsx` | Thêm nút "Gửi Nhắc Nhở" + UI states |
| 3 | `supabase/functions/notify-gift-ready/index.ts` | Edge Function gửi tin nhắn thông báo |

---

## Luồng Xử Lý Mới

```text
User A click "Tặng" cho User B
    │
    ├─► User B có wallet → Hiện form tặng bình thường
    │
    └─► User B KHÔNG có wallet
            │
            ├─► Hiện thông báo "Người nhận chưa thiết lập ví"
            │
            └─► User A click "Gửi Nhắc Nhở"
                    │
                    └─► Edge Function: notify-gift-ready
                            │
                            ├─► Tạo/tìm conversation giữa A và B
                            │
                            └─► Gửi tin nhắn đặc biệt cho B
```

---

## Kết Quả Mong Đợi

1. **Tất cả users đều có thể nhận quà** (nếu có wallet address)
2. **UI hiển thị đúng** - fallback từ external → custodial wallet
3. **Thông báo thân thiện** khi người nhận chưa sẵn sàng
4. **Trải nghiệm liền mạch** - người tặng không bị "bế tắc"

---

## Timeline Ước Tính

| Task | Thời gian |
|------|-----------|
| Fix Profile.tsx query & fallback | 5 phút |
| Tạo Edge Function notify-gift-ready | 10 phút |
| Update DonationDialog UI | 10 phút |
| Testing | 10 phút |
| **Tổng** | **~35 phút** |
