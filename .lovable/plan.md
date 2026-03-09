

## Kế hoạch: Nâng cấp Google description, xóa sạch custodial wallet, và audit cột wallet

### 1. Cập nhật mô tả Google trong Security Settings

**File**: `src/components/settings/SecuritySettingsContent.tsx` (dòng 112)

Thay đổi `description` của mục Google:
- Nếu `hasEmailLoginMethod` (đã liên kết email) → "Bạn đã liên kết email nên có thể đăng nhập vào tài khoản này bằng Google nhé"
- Nếu chưa → giữ nguyên "Đăng nhập nhanh bằng tài khoản Google"

Giữ nguyên `statusLabel` ("Chưa liên kết" / "Đã liên kết") theo `hasGoogleIdentity`.

---

### 2. Xóa sạch tàn dư custodial wallet

**Nguyên nhân**: Cột `default_wallet_type` có `DEFAULT 'custodial'` và constraint chỉ cho phép `('custodial', 'external')`. Mỗi user mới tạo đều tự động nhận giá trị 'custodial' dù tính năng đã bị gỡ.

**Migration SQL**:
- Thay đổi DEFAULT của `default_wallet_type` thành `NULL`
- Cập nhật constraint: cho phép `('external', 'none')` thay vì `('custodial', 'external')`
- Cập nhật tất cả rows hiện có: `default_wallet_type = 'custodial'` → `NULL`
- Xóa dữ liệu trong cột `custodial_wallet_address` (set NULL cho tất cả)

**Edge functions cần sửa**:
- `disconnect-external-wallet/index.ts`: dòng 110, đổi `default_wallet_type: 'none'` → đã đúng (giá trị 'none'), nhưng cần đảm bảo constraint mới cho phép 'none'
- `sso-web3-auth/index.ts`: dòng 262, giữ `default_wallet_type: 'external'` — OK
- `sso-token/index.ts`: dòng 180, loại bỏ select `custodial_wallet_address`, dòng 192 loại bỏ `custodial_wallet`

**SDK types** (`sdk-package/src/types.ts`): Đánh dấu `custodial_wallet` deprecated hoặc xóa

---

### 3. Audit các cột wallet trong bảng profiles

| Cột | Ý nghĩa | Đề xuất |
|-----|---------|---------|
| `wallet_address` | **DEPRECATED** - địa chỉ ví cũ từ đăng ký ban đầu | **Giữ lại** (dữ liệu lịch sử), không sử dụng trong code mới |
| `external_wallet_address` | Địa chỉ ví ngoài (MetaMask) khi user connect | **Giữ** - đang hoạt động |
| `custodial_wallet_address` | Địa chỉ ví custodial (đã gỡ tính năng) | **Giữ cột** nhưng xóa dữ liệu, không ghi mới |
| `default_wallet_type` | Loại ví mặc định ('custodial'/'external') | **Sửa**: default NULL, bỏ 'custodial' khỏi constraint |
| `public_wallet_address` | Địa chỉ ví công khai user chọn hiển thị | **Giữ** - đang hoạt động, quan trọng |
| `wallet_change_count_30d` | Đếm số lần thay đổi ví trong 30 ngày | **Giữ** - bảo mật chống lạm dụng |
| `wallet_risk_status` | Trạng thái rủi ro ví (normal/blocked) | **Giữ** - bảo mật |
| `last_wallet_change_at` | Thời điểm thay đổi ví gần nhất | **Giữ** - bảo mật |

**Không đề xuất xóa cột nào** vì dữ liệu lịch sử vẫn có giá trị cho audit. Chỉ dọn dẹp giá trị và default.

---

### Tóm tắt files cần sửa
1. `src/components/settings/SecuritySettingsContent.tsx` — mô tả Google
2. **Migration SQL** — sửa default + constraint `default_wallet_type`, xóa data custodial
3. `supabase/functions/sso-token/index.ts` — loại bỏ custodial_wallet
4. `sdk-package/src/types.ts` — đánh dấu deprecated

