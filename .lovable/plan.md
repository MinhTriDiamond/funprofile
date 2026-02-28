

# Sửa 3 lỗi trong luồng FUN Money

## Tổng quan
Có 3 vấn đề cần sửa: (1) trạng thái `signing` chưa được hiển thị đúng trong lịch sử mint của user, (2) ActivateDialog hiện toast thành công giả lặp lại, (3) attester thấy các request chưa có chữ ký nào.

---

## Lỗi 1: Hiển thị trạng thái `signing` trong Mint History

**Nguyên nhân:** Khi 1 attester ký, request chuyển sang trạng thái `signing` nhưng trạng thái này chưa được xử lý trong UI. Trong `useMintHistory.ts`, mảng `activeStatuses` thiếu `signing`. Trong `LightScoreDashboard.tsx`, hàm `getMintStatusConfig` không có case `signing`.

Lưu ý: Số dư Locked/Activated on-chain đã đọc trực tiếp từ smart contract qua hàm `alloc()`, nên luôn chính xác. Vấn đề chỉ là hiển thị trạng thái request chưa rõ ràng.

**Thay đổi:**
- **`src/hooks/useMintHistory.ts`** (dòng 126): Thêm `'signing'` vào mảng `activeStatuses`
- **`src/components/wallet/LightScoreDashboard.tsx`** (dòng 61-76): Thêm case `signing` vào `getMintStatusConfig` với nhãn "Đang ký (X/3)"

---

## Lỗi 2: ActivateDialog hiện toast thành công liên tục

**Nguyên nhân:** `useEffect` theo dõi `isSuccess` từ `useWaitForTransactionReceipt`. Khi dialog đóng rồi mở lại, `isSuccess` vẫn là `true` từ giao dịch trước, nên effect chạy lại và hiện toast thành công giả.

**Thay đổi trong `src/components/wallet/ActivateDialog.tsx`:**
- Thêm `useRef` để lưu `lastToastedHash` (txHash đã hiện toast)
- Chỉ hiện toast khi `txHash` khác với `lastToastedHash`
- Reset `amount` và `sliderValue` khi dialog mở lại

---

## Lỗi 3: Attester thấy request chưa có chữ ký

**Nguyên nhân:** Trong `useAttesterSigning.ts`, truy vấn lấy tất cả request có status `pending_sig`, `signing`, `signed` mà không lọc theo số chữ ký. Yêu cầu là chỉ hiện request đã có ít nhất 1 chữ ký (không hiện request `pending_sig` chưa ai ký).

**Thay đổi trong `src/hooks/useAttesterSigning.ts`** (dòng 75-79):
- Bỏ status `pending_sig` khỏi filter, chỉ lấy `['signing', 'signed']`
- Như vậy chỉ hiện request đã có ít nhất 1 nhóm GOV ký

---

## Tóm tắt các file thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useMintHistory.ts` | Thêm `signing` vào `activeStatuses` |
| `src/components/wallet/LightScoreDashboard.tsx` | Thêm case `signing` vào `getMintStatusConfig` |
| `src/components/wallet/ActivateDialog.tsx` | Sửa logic toast bằng `lastToastedHash` ref |
| `src/hooks/useAttesterSigning.ts` | Lọc bỏ request `pending_sig` khỏi panel attester |

