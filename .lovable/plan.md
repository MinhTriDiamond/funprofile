

## Sửa lỗi "Người nhận chưa thiết lập ví" khi họ đã kết nối ví

### Nguyên nhân gốc

Hệ thống có **3 cột** lưu địa chỉ ví trong bảng profiles:
- `public_wallet_address` -- do user tự nhập trong Edit Profile
- `wallet_address` -- trường cũ (legacy)
- `external_wallet_address` -- do hệ thống tự lưu khi user đăng nhập/kết nối ví qua Web3

Khi user đăng nhập bằng ví (Web3 Login) hoặc kết nối ví trong Wallet Center, hệ thống chỉ lưu vào `external_wallet_address` và `wallet_address`, nhưng **KHÔNG** lưu vào `public_wallet_address`.

Trong khi đó, giao diện Tặng Quà kiểm tra ví người nhận qua: `public_wallet_address || wallet_address` -- bỏ sót `external_wallet_address`.

Kết quả: **54 user** đã kết nối ví nhưng hệ thống báo "chưa thiết lập ví".

### Thay đổi cần thực hiện

#### 1. `src/components/donations/UnifiedGiftSendDialog.tsx`

**a) Cập nhật `resolveWalletAddress`** để kiểm tra cả 3 trường:
```
const resolveWalletAddress = (profile: any): string | null => {
  return profile.public_wallet_address || profile.external_wallet_address || profile.wallet_address || null;
};
```

**b) Cập nhật `selectFields`** để thêm `external_wallet_address`:
```
const selectFields = 'id, username, avatar_url, wallet_address, public_wallet_address, external_wallet_address';
```

**c) Cập nhật `hasVerifiedWallet`** để bao gồm cả `external_wallet_address`:
```
hasVerifiedWallet: !!(p.public_wallet_address || p.external_wallet_address),
```

#### 2. `supabase/functions/sso-web3-auth/index.ts`

Khi user đăng nhập bằng ví (cả user mới và user cũ), tự động đồng bộ `public_wallet_address` nếu nó đang trống:

Thêm vào bước update profile (khi user mới tạo xong hoặc user cũ đăng nhập):
```
public_wallet_address: normalizedAddress,
```

#### 3. `supabase/functions/connect-external-wallet/index.ts`

Khi user kết nối ví bên ngoài, cũng tự động đồng bộ `public_wallet_address`:
```
update({
  external_wallet_address: normalizedAddress,
  wallet_address: normalizedAddress,
  public_wallet_address: normalizedAddress,
})
```

#### 4. Migration: Đồng bộ 54 user hiện tại

Chạy migration SQL để cập nhật `public_wallet_address` cho những user đã có `external_wallet_address` nhưng chưa có `public_wallet_address`:
```sql
UPDATE profiles
SET public_wallet_address = external_wallet_address
WHERE external_wallet_address IS NOT NULL
  AND (public_wallet_address IS NULL OR public_wallet_address = '');
```

### Kết quả
- 54 user hiện tại sẽ được đồng bộ ngay lập tức qua migration
- Giao diện Tặng Quà sẽ nhận diện đúng ví người nhận từ cả 3 trường
- Các user đăng nhập/kết nối ví trong tương lai sẽ tự động có `public_wallet_address`
- Không ảnh hưởng đến user đã tự nhập `public_wallet_address` trong Edit Profile

