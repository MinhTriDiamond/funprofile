

## Kế hoạch: Xoá mục "Treasury Đã Nhận" khỏi Honor Board

Xoá stat item `treasuryReceived` (dòng 113-120) khỏi mảng `statItems` trong `AppHonorBoard.tsx`.

Đồng thời dọn dẹp:
- Xoá field `treasuryReceived` khỏi interface `AppStats` (dòng 19)
- Xoá dòng parse `treasuryReceived` trong queryFn (dòng 41)
- Xoá `treasuryReceived` khỏi return object (dòng 44)
- Xoá import `Wallet` icon nếu không dùng nơi khác

**File thay đổi:** `src/components/feed/AppHonorBoard.tsx` duy nhất.

