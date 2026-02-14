

# Sửa lỗi format Private Key trong claim-reward

## Vấn đề
Private key export từ MetaMask/Trust Wallet chỉ có 64 ký tự hex (không có prefix `0x`). Nhưng thư viện `viem` yêu cầu format `0x` + 64 hex. Hiện tại edge function không tự động xử lý trường hợp này nên bị lỗi "invalid private key".

## Giải pháp
Sửa file `supabase/functions/claim-reward/index.ts` tại bước 10 (khoảng dòng 240-248) để tự động thêm prefix `0x` nếu private key chưa có:

```typescript
// Trước khi tạo account từ private key:
let pk = treasuryPrivateKey;
if (!pk.startsWith('0x')) {
  pk = '0x' + pk;
}
const account = privateKeyToAccount(pk as `0x${string}`);
```

Thay đổi duy nhất trong 1 file, sau đó redeploy edge function.

## Kỹ thuật
- File: `supabase/functions/claim-reward/index.ts`
- Vị trí: dòng khoảng 250-251, nơi gọi `privateKeyToAccount()`
- Thêm logic normalize prefix `0x` trước khi dùng private key
- Không cần con nhập lại secret, code sẽ tự xử lý

