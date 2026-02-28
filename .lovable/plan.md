

# Fix: Loading State Ảnh Hưởng Tất Cả Request Khi Ký

## Vấn Đề

Khi attester ký 1 request, tất cả các request khác cũng hiển thị trạng thái loading (spinner xoay) vì hệ thống dùng 1 biến `isSigning: boolean` chung cho toàn bộ danh sách.

## Giải Pháp

Thay `isSigning: boolean` bằng `signingRequestId: string | null` để theo dõi chính xác request nào đang được ký.

## Chi tiết kỹ thuật

### File 1: `src/hooks/useAttesterSigning.ts`
- Thay state `isSigning` (boolean) thanh `signingRequestId` (string | null)
- Set `signingRequestId = requestId` khi bat dau ky, reset ve `null` khi xong
- Export `signingRequestId` thay vi `isSigning`

### File 2: `src/components/wallet/AttesterSigningPanel.tsx`
- Nhan `signingRequestId` thay vi `isSigning`
- Trong `RequestCard`, so sanh `signingRequestId === request.id` de xac dinh card nao dang loading
- Chi disable nut ky cua request dang duoc ky, cac request khac van bam duoc

### File 3: `src/components/wallet/tabs/FunMoneyTab.tsx`
- Cap nhat prop truyen tu `isSigning` sang `signingRequestId`

