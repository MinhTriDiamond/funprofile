

## Sửa lỗi không copy được link và mã ví trên điện thoại

### Vấn đề
Trên mobile (đặc biệt trong dApp browser của ví), `navigator.clipboard.writeText` bị chặn bởi permissions policy. Mặc dù `ProfileHeader.tsx` đã dùng `copyToClipboard` utility có fallback, nhưng có 2 vấn đề:

1. **`ReceiveTab.tsx`** vẫn gọi trực tiếp `navigator.clipboard.writeText` — không có fallback → fail trên mobile.
2. **`select-all` CSS class** trên cả link và ví trong `ProfileHeader.tsx` — class này can thiệp vào sự kiện click trên mobile, khiến trình duyệt cố gắng select text thay vì trigger onClick handler.

### Thay đổi

**File 1: `src/components/profile/ProfileHeader.tsx`**
- Xóa class `select-all` khỏi button copy link (`fun.rich/{username}`) và span hiển thị địa chỉ ví
- Đảm bảo `touch-manipulation` vẫn được giữ để tối ưu tap trên mobile

**File 2: `src/components/wallet/ReceiveTab.tsx`**
- Thay `navigator.clipboard.writeText(address)` bằng `copyToClipboard(address)` từ `@/utils/clipboard`
- Import `copyToClipboard` utility

Không cần thay đổi `clipboard.ts` — fallback logic đã hoạt động tốt.

