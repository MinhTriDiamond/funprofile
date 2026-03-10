

## Fix lỗi bảo mật nghiêm trọng: Đăng nhập ví bị nhầm tài khoản

### Nguyên nhân gốc

Hai lỗi kết hợp gây ra việc đăng nhập ví của @leminhtri nhưng vào tài khoản @gioi89:

1. **Case-sensitive lookup**: DB lưu ví dạng mixed-case (`0x847B5b...`), nhưng Edge Function normalize thành lowercase (`0x847b5b...`). PostgreSQL so sánh `=` phân biệt hoa/thường → tất cả 4 bước lookup đều MISS.

2. **Fallback nguy hiểm**: Khi lookup thất bại, code rơi vào bước 5 dùng `listUsers({ filter: email })` — hàm này match không chính xác → trả về user sai (@gioi89) → cấp session cho tài khoản sai.

### Kế hoạch fix

**1. Edge Function `sso-web3-auth/index.ts`**
- **Xóa hoàn toàn** bước 5 `email_fallback` (dòng 113-124) — đây là nguyên nhân trực tiếp gây nhầm tài khoản
- **Đổi `.eq()` thành `.ilike()`** cho tất cả 4 bước lookup wallet để so sánh không phân biệt hoa/thường

**2. Database migration — Chuẩn hóa dữ liệu hiện tại**
```sql
-- Lowercase tất cả wallet address trong profiles
UPDATE profiles SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address);
UPDATE profiles SET external_wallet_address = LOWER(external_wallet_address) WHERE external_wallet_address IS NOT NULL AND external_wallet_address != LOWER(external_wallet_address);
UPDATE profiles SET public_wallet_address = LOWER(public_wallet_address) WHERE public_wallet_address IS NOT NULL AND public_wallet_address != LOWER(public_wallet_address);
UPDATE profiles SET login_wallet_address = LOWER(login_wallet_address) WHERE login_wallet_address IS NOT NULL AND login_wallet_address != LOWER(login_wallet_address);

-- Lowercase wallet_history
UPDATE wallet_history SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address);

-- Trigger tự động lowercase khi INSERT/UPDATE
CREATE OR REPLACE FUNCTION normalize_wallet_addresses()
RETURNS TRIGGER AS $$
BEGIN
  NEW.wallet_address := LOWER(NEW.wallet_address);
  NEW.external_wallet_address := LOWER(NEW.external_wallet_address);
  NEW.public_wallet_address := LOWER(NEW.public_wallet_address);
  NEW.login_wallet_address := LOWER(NEW.login_wallet_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_wallet_addresses
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION normalize_wallet_addresses();
```

**3. Không cần sửa `connect-external-wallet`** — function này đã normalize lowercase trước khi lưu.

### Tóm tắt

| Vấn đề | Trước fix | Sau fix |
|---|---|---|
| Wallet lookup | Case-sensitive, miss 236 profiles | Case-insensitive (`.ilike()`) |
| Email fallback | Trả user sai → nhầm tài khoản | Xóa hoàn toàn |
| Dữ liệu DB | Mixed-case | Tất cả lowercase + trigger tự động |

