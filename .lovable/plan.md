
# Thắt chặt bảo mật: Giới hạn rút 2 lần/24h, tổng tối đa 500.000 CAMLY + Bỏ tự tạo tài khoản ví + Thêm ô ví khi đăng ký

## Tổng quan 4 thay đổi

### 1. Giới hạn rút: Tối đa 2 lần/24h, tổng không quá 500.000 CAMLY
- Nếu đã rút 2 lần trong 24h --> thông báo "Đã đạt giới hạn rút trong ngày, hẹn hôm sau"
- Nếu tổng số đã rút trong 24h >= 500.000 --> thông báo tương tự
- Lần rút thứ 3 trở đi mới bị on_hold (thay vì lần thứ 4 như hiện tại)

### 2. Bỏ tự động tạo tài khoản khi đăng nhập ví
- Ví chưa đăng ký --> trả lỗi 403, hiển thị thông báo yêu cầu đăng ký tài khoản trước

### 3. Thêm ô "Wallet Address" vào form đăng ký (Classic Login)
- Khi chọn Đăng ký, hiển thị thêm ô nhập ví (không bắt buộc)
- Validate format `0x` + 40 ký tự hex
- Lưu vào `external_wallet_address` trong profile sau khi đăng ký thành công

### 4. Xử lý lỗi ví chưa đăng ký ở WalletLoginContent
- Hiển thị toast nhắc nhở đăng ký tài khoản trước

---

## Chi tiết kỹ thuật

### File 1: `supabase/functions/claim-reward/index.ts`

**Dòng 429**: Đổi `recentClaimCount >= 3` thành `recentClaimCount >= 3` (giữ on_hold ở lần 3+)

**Thêm check MỚI trước dòng 429**: Kiểm tra nếu `recentClaimCount >= 2` thì trả lỗi 429 (không on_hold, chỉ thông báo):
```
if (recentClaimCount >= 2) {
  return Response 429: "Bạn đã rút 2 lần trong 24 giờ. Vui lòng quay lại ngày mai!"
}
```

**Giữ nguyên** check `recentClaimCount >= 3` phía sau để on_hold nếu user bypass (phòng trường hợp race condition).

**Dòng 488-498**: Giữ nguyên check `dailyRemaining <= 0` (tổng 500.000/ngày).

### File 2: `supabase/functions/sso-web3-auth/index.ts`

**Dòng 168-220** (block `else` tạo user mới): Thay toàn bộ bằng response lỗi 403:
```json
{
  "success": false,
  "error": "WALLET_NOT_REGISTERED",
  "message": "Ví này chưa được đăng ký. Vui lòng đăng ký tài khoản trước và dán mã ví vào khi đăng ký, sau đó mới đăng nhập bằng ví được."
}
```

### File 3: `src/components/auth/ClassicEmailLogin.tsx`

- Thêm state `walletAddress` (string)
- Trong form đăng ký (khi `!isLogin`), thêm ô Input "Wallet Address (không bắt buộc)" với placeholder `0x...`
- Validate format nếu có nhập: regex `^0x[a-fA-F0-9]{40}$`
- Truyền `wallet_address` vào `user_metadata` khi signup
- Sau signup thành công (dòng 95-99), nếu có `walletAddress` thì update `external_wallet_address` trong profiles

### File 4: `src/components/auth/WalletLoginContent.tsx`

- Trong block catch (dòng 100-109), kiểm tra nếu error message chứa "WALLET_NOT_REGISTERED" hoặc tương tự:
  - Hiển thị toast cảnh báo: "Ví chưa đăng ký! Vui lòng tạo tài khoản trước rồi dán mã ví khi đăng ký."
  - Có thể thêm nút/link để chuyển sang tab đăng ký

### Tác động
- 2 edge functions sửa: `claim-reward`, `sso-web3-auth`
- 2 file frontend sửa: `ClassicEmailLogin.tsx`, `WalletLoginContent.tsx`
- User rút tối đa 2 lần/24h, tổng không quá 500.000 CAMLY
- Ví mới không tự tạo tài khoản nữa
- Đăng ký có thêm ô dán ví (không bắt buộc)
