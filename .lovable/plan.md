

## Thêm logo FUN MONEY coin vào Gift Celebration Card

### Thay đổi

**1. Copy logo FUN MONEY vào project**
- Copy `user-uploads://fun_money.jpg` → `src/assets/fun-money-coin.png`

**2. File `src/components/feed/GiftCelebrationCard.tsx`**

- Import thêm: `import funMoneyCoinImg from '@/assets/fun-money-coin.png';`
- Thêm thuộc tính `coin` vào mảng `FLOATING_COINS` để xen kẽ 2 loại coin:
  - Coin chẵn (index 0, 2, 4...) dùng `camlyCoinImg`
  - Coin lẻ (index 1, 3, 5...) dùng `funMoneyCoinImg`
- Cập nhật phần render coin overlay: dùng `coin.coinType` hoặc index để chọn đúng ảnh `src`

### Kết quả
- Card gift có **cả 2 loại đồng tiền** CAMLY và FUN MONEY xen kẽ bay lả tả lấp lánh
- Không thay đổi logic hay layout, chỉ thêm ảnh mới và xen kẽ nguồn ảnh

### File thay đổi
- `src/assets/fun-money-coin.png` (mới)
- `src/components/feed/GiftCelebrationCard.tsx`

