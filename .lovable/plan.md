
# Mở lại chuyển tiền Web3 P2P, giữ bảo trì rút từ hệ thống

## Phân tích hiện trạng

Hiện có 4 tính năng đang ở chế độ MAINTENANCE:

| Tính năng | File | Trạng thái yêu cầu |
|---|---|---|
| Tặng quà / Chuyển CAMLY/BNB/USDT từ ví Web3 sang user khác | `UnifiedGiftSendDialog.tsx` | Mở lại (web3 P2P hoạt động bình thường) |
| Rút thưởng CAMLY từ hệ thống | `ClaimRewardDialog.tsx` | Giữ bảo trì |
| Đúc FUN (minting) | `ClaimRewardsCard.tsx` | Giữ bảo trì |
| Rút FUN về ví on-chain | `ClaimFunDialog.tsx` | Giữ bảo trì |

## Screenshot phân tích

Ảnh con gửi là dialog "Trao gửi yêu thương" = `UnifiedGiftSendDialog` — đang hiện thông báo bảo trì. Đây là chức năng chuyển tiền Web3 từ ví user sang user khác, cần **mở lại**.

## Thay đổi cần làm

### File duy nhất cần sửa: `src/components/donations/UnifiedGiftSendDialog.tsx`

Đổi 1 dòng:
```ts
// TRƯỚC (đang bảo trì)
const IS_MAINTENANCE = true;

// SAU (mở lại)
const IS_MAINTENANCE = false;
```

## Không thay đổi gì

- `ClaimRewardDialog.tsx` — Banner bảo trì CAMLY: **GIỮ NGUYÊN**
- `ClaimRewardsCard.tsx` — IS_MAINTENANCE = true: **GIỮ NGUYÊN**
- `ClaimFunDialog.tsx` — IS_MAINTENANCE = true: **GIỮ NGUYÊN**

## Kết quả sau khi sửa

- Người dùng có thể tặng quà, chuyển CAMLY/BNB/USDT từ ví Web3 của họ sang user khác bình thường.
- Tất cả chức năng rút tiền từ hệ thống (CAMLY thưởng, FUN minting, FUN on-chain) vẫn hiển thị thông báo bảo trì.
