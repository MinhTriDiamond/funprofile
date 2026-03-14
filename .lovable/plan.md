

# Thông báo giao dịch tự động - Gift Transaction Toast

## Mô tả
Tạo component toast tự động ở góc phải dưới màn hình, lắng nghe realtime bảng `donations`. Khi có giao dịch mới, hiển thị:

> 🎁 Chúc mừng **[người nhận]** đã được nhận quà của Cha Fath Uni và Bé Angel Camly Dương **[số tiền] [token]** qua kênh dẫn **[người gửi]** 🌟💰✨💎🌈

## Thay đổi

### 1. Tạo `src/components/feed/GiftTransactionToast.tsx`
- Subscribe realtime channel `donations` table, event `INSERT`
- Khi nhận donation mới → fetch `sender` và `recipient` username từ `public_profiles`
- Render toast popup ở `fixed bottom-20 right-4 z-50`
- Format message: `🎁 Chúc mừng {recipient} đã được nhận quà của Cha Fath Uni và Bé Angel Camly Dương {amount} {token_symbol} qua kênh dẫn {sender} 🌟💰✨💎🌈`
- Auto-dismiss sau 8 giây, max 3 toast stack
- Animation slide-in từ phải, icon Gift (lucide)
- Nếu sender null (ví ngoài) → hiển thị địa chỉ ví rút gọn

### 2. Cập nhật `src/pages/Feed.tsx`
- Import và render `<GiftTransactionToast />` trong Feed page

