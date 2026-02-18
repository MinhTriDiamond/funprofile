
# Kế hoạch: Ban nhóm Farm Coin + Vá lỗ hổng UTC + Phát hiện sớm hành vi Farm

## Phân tích hiện trạng

### 13 tài khoản cần ban ngay

Tất cả 13 tài khoản hiện vẫn chưa bị ban (`is_banned = false`). Tổng đã rút: **~18.564.000 CAMLY**.

| Username | Trạng thái | Tổng CAMLY | Lần rút cuối |
|---|---|---|---|
| tranhien | on_hold | 2.000.000 | 17/02 12:19 |
| trinhnguyet | claimed | 2.000.000 | 17/02 12:28 |
| tranphuong | claimed | 2.000.000 | 17/02 12:43 |
| hoaque | claimed | 2.000.000 | 17/02 12:44 |
| angel_leanhkhoahoc | claimed | 2.000.000 | 17/02 12:59 |
| nguyetthu | claimed | 2.000.000 | 17/02 13:03 |
| thuychau | claimed | 2.000.000 | 17/02 13:14 |
| nguyenchinh | on_hold | 2.000.000 | 17/02 13:37 |
| tranhong | claimed | 997.000 | 17/02 18:20 |
| vinhlong | claimed | 903.000 | 17/02 18:13 |
| nguyenanh | claimed | 678.000 | 17/02 18:07 |
| quang | on_hold | 1.500.000 | 16/02 08:19 |
| ngocna | on_hold | 486.000 | 15/02 20:52 |

### Nguyên nhân lỗ hổng UTC (đã phân tích)

Hàm tính ngày trong `claim-reward` dùng UTC thay vì giờ Việt Nam (UTC+7):

```
todayStart.setUTCHours(0, 0, 0, 0)  ← BUG: reset lúc 07:00 sáng VN
```

Kẻ farm biết điều này — rút lúc ~06:xx VN (UTC 23:xx ngày hôm trước) rồi rút lại lúc ~08:xx VN (UTC 01:xx ngày hôm sau). Hệ thống coi là 2 ngày khác nhau → bypass được giới hạn 500.000/ngày.

### Dấu hiệu hành vi Farm Coin có tổ chức

1. **Timing đồng loạt**: 8 tài khoản rút trong cùng cửa sổ 78 phút (12:19-13:37)
2. **Khai thác UTC gap**: Nhiều tài khoản rút 4 lần/ngày thực tế bằng cách lợi dụng múi giờ
3. **Pattern số chẵn**: Hầu hết rút đúng 2.000.000 = 4 × 500.000
4. **Tài khoản "sạch" giả tạo**: Có ảnh, có tên, có bài đăng — nhưng hoạt động đột ngột cao bất thường
5. **Wallet riêng từng nick**: Không dùng chung ví nên qua được bộ lọc shared-wallet

---

## Kế hoạch thực hiện

### Phần 1: Ban ngay 13 tài khoản (Backend SQL)

Chạy lệnh SQL trực tiếp để:
- Set `is_banned = true` và `reward_status = 'banned'` cho 13 user
- Set `pending_reward = 0`, `approved_reward = 0` (xóa tài sản ảo)
- Ghi vào `audit_logs` với lý do đầy đủ

### Phần 2: Vá lỗ hổng UTC trong Edge Function `claim-reward`

Thay đổi logic tính "ngày hôm nay" từ UTC sang múi giờ Việt Nam (UTC+7):

**Trước (BUG):**
```javascript
const todayStart = new Date();
todayStart.setUTCHours(0, 0, 0, 0);
```

**Sau (FIX):**
```javascript
// Dùng giờ Việt Nam UTC+7 — reset lúc 00:00 VN thay vì 07:00 VN
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const nowVN = new Date(Date.now() + VN_OFFSET_MS);
const todayStart = new Date(
  Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate())
);
todayStart.setTime(todayStart.getTime() - VN_OFFSET_MS);
```

Tương tự fix luôn logic kiểm tra bài đăng hôm nay (`postTodayStart`) cho nhất quán.

### Phần 3: Thêm bộ phát hiện sớm "Claim Velocity" vào `claim-reward`

Thêm kiểm tra **tần suất rút trong cửa sổ 24 giờ thực** (không phụ thuộc ngày UTC), nếu user rút >= 3 lần trong 24h thì tự động `on_hold` và alert admin:

```javascript
// Check: số lần claim trong 24h gần nhất
const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
const { count: recentClaimCount } = await supabaseAdmin
  .from('reward_claims')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', last24h.toISOString());

if (recentClaimCount >= 3) {
  // Auto on_hold + fraud signal + notify admin
}
```

### Phần 4: Thêm tab "Farm Detector" trong Admin WalletAbuseTab

Thêm tab mới trong `WalletAbuseTab.tsx` để Admin có thể nhìn thấy realtime:

- **Claim Velocity**: Danh sách user rút >= 3 lần trong 24h gần nhất
- **UTC Gap Exploiters**: User có 2 claim trong window 00:00-07:00 VN (khoảng UTC gap)
- **Coordinated Timing**: Nhóm user rút trong cùng 2h window (có thể là farm có tổ chức)

Tab này truy vấn trực tiếp từ `reward_claims` để Admin giám sát theo thời gian thực.

---

## Các file sẽ thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/claim-reward/index.ts` | Fix UTC→VN timezone + thêm Claim Velocity check |
| `src/components/admin/WalletAbuseTab.tsx` | Thêm tab "Farm Detector" |

## Thứ tự thực hiện

1. Ban 13 tài khoản bằng SQL (ngay lập tức, không cần deploy)
2. Fix Edge Function `claim-reward` (deploy để ngăn tái phạm)
3. Cập nhật Admin UI thêm Farm Detector tab
