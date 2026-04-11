

## Kế hoạch: Sửa lỗi "Xem xét cảnh báo" ẩn và không click được khi Activate

### Nguyên nhân

Có 2 vấn đề:

1. **Dialog overlay chặn popup ví**: Dialog có `z-index: 150` với overlay toàn màn hình. Khi MetaMask (đặc biệt trên mobile in-app browser) hiển thị popup xác nhận giao dịch, overlay này chặn mọi tương tác bên ngoài dialog.

2. **Tham số `chain: bscTestnet` gây lỗi wagmi**: Theo ghi chú kỹ thuật đã có, truyền `chain` thủ công vào `writeContractAsync` gây crash/lỗi gas estimation trên một số wallet connector (MetaMask desktop). Hệ thống đã có `useAutoChainSwitch` tự chuyển mạng, nên không cần truyền `chain` nữa.

### Giải pháp

#### 1. Ẩn Dialog khi đang ký giao dịch
- Khi user nhấn "Activate" và `writeContractAsync` được gọi, **ẩn dialog** (set `open = false` tạm thời) để overlay không chặn popup ví
- Nếu giao dịch bị reject hoặc lỗi → mở lại dialog
- Nếu thành công → giữ đóng, hiện toast thành công

#### 2. Xóa `chain: bscTestnet` khỏi tất cả lệnh gọi client-side
- `ActivateDialog.tsx` — xóa `chain: bscTestnet` và `account: address`
- `useClaimFun.ts` — xóa `chain: bscTestnet` và `account: address`  
- `usePplpAdmin.ts` — xóa `chain: bscTestnet` và `account: address`
- Giữ nguyên trong edge function (`pplp-auto-submit`) vì đó là server-side

### Các file cần sửa
| File | Thay đổi |
|------|----------|
| `src/components/wallet/ActivateDialog.tsx` | Ẩn dialog khi signing + xóa `chain`/`account` param |
| `src/hooks/useClaimFun.ts` | Xóa `chain`/`account` param |
| `src/hooks/usePplpAdmin.ts` | Xóa `chain`/`account` param |

