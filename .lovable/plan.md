

## Kế hoạch: Sửa lỗi chuyển tiền chậm và không hiện nút xác nhận trên mobile

### Nguyên nhân gốc

Trong `handleSend` (dòng 470-501 của `UnifiedGiftSendDialog.tsx`), sau khi user ký giao dịch và nhận được `hash`, hệ thống **block UI tới 60 giây** để chờ `waitForReceipt`:

```text
1. User bấm "Xác nhận" → txStep = 'signing' (ví mở lên)
2. User ký xong → hash trả về, txStep = 'broadcasted' (35%)
3. Gọi await waitForReceipt(hash) → chờ tối đa 60s
   → Trong thời gian này: KHÔNG CẬP NHẬT txStep
   → User chỉ thấy thanh progress đứng ở 35%, nút bị disable
4. Nếu timeout (rất hay xảy ra trên mobile) → confirmed = false
   → Hiện toast lỗi, resetState(), KHÔNG BAO GIỜ hiển thị celebration
```

Trên mobile, `waitForReceipt` thường fail vì:
- Trình duyệt mobile throttle tab khi user chuyển sang app ví
- Kết nối RPC không ổn định trên mạng di động
- 60 giây chờ mà không có phản hồi gì → user nghĩ bị treo

### Giải pháp

**Triết lý: Khi đã có `txHash` = giao dịch đã được broadcast lên blockchain. Không cần block UI chờ receipt.**

#### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

**1. Sửa `handleSend` — single send (dòng 470-501):**
- Sau khi nhận `hash`, **lập tức hiển thị celebration** và ghi donation trong background
- Chạy `waitForReceipt` trong background (không block) — nếu fail thì chỉ log, không hiện lỗi cho user
- Bỏ logic `if (confirmed) {...} else { toast.error; resetState() }` vì nó chặn celebration khi receipt chậm

**2. Sửa `handleSend` — multi send (dòng 502-542):**
- Tương tự: coi tx có hash là thành công, không block trên `waitForReceipt` cho mỗi recipient
- Chạy receipt check + record donation trong background sau khi vòng lặp kết thúc

**3. Cập nhật txStep thủ công:**
- Sau khi nhận hash, set `txStep` thành `'confirming'` (60%) rồi `'success'` (100%) để user thấy thanh progress chạy mượt thay vì đứng ở 35%

#### File: `src/hooks/useSendToken.ts`

- Không cần sửa — logic `skipBackground: true` đã đúng

### Kết quả mong đợi
- Trên mobile: User ký giao dịch xong → celebration hiện ngay trong 1-2 giây (thay vì chờ 60s)
- Donation vẫn được ghi đầy đủ trong background
- Nếu receipt check fail, hệ thống retry và lưu pending vào localStorage để khôi phục sau
- Nút xác nhận luôn phản hồi nhanh, không bao giờ bị treo

