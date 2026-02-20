

# Ke hoach: Duyet lai 3 tai khoan + Ban farm Gmail + Nang cap chong gian lan

## Phan 1: Duyet lai 3 tai khoan hop le

Cap nhat `reward_status = 'approved'` cho:
- `angelthanhthuy` (id: `f3d8831c-...`)
- `susu` (id: `bfc87ada-...`)
- `phuongloan79` (id: `d38fcba7-...`)

Dong thoi go co `is_flagged` trong `pplp_device_registry` cho 3 user nay.

## Phan 2: Ban cac cum farm Gmail

### Danh sach BAN (loai tru hoangtydo88, hoangtydo8888, hoangtydo888888):

**Cum `congminhyvnh` (18 tai khoan)** — Da rut: 783,000 CAMLY
- `congminh544`, `kieudiem545`, `dien6874`, `diemr432`, `hongtrue54`, `logt`, `hongkong`, `hongvan`, `dao`, `nhu`, `diem`, `lien`, `hongnguyen`, `loan`, `tieuha`, `longnu`, `congminhyvnh24`, `loannguyebn`

**Cum `bongsieuoi` (4 tai khoan)** — 0 CAMLY
- `LH_Happy`, `LH_ThinhVuong`, `bongsieuoi3722r53`, `LH_HaoQuangVuTru`

**Cum `huuxuan` (3 tai khoan)**
- Cac tai khoan co prefix `huuxuan`

**Cum `tacongminh` (3 tai khoan)**
- Cac tai khoan co prefix `tacongminh`

**Cum `teobmw` (3 tai khoan)**
- Cac tai khoan co prefix `teobmw`

**Cum `wanting` (3 tai khoan)**
- Cac tai khoan co prefix `wanting`

**KHONG BAN:** `hoangtydo885rm536`, `angelhoangtydo`, `Hoangtydo88` (theo yeu cau)

### Thuc hien:
- Goi `ban_user_permanently` cho tung tai khoan qua code
- Ghi audit log voi ly do "Gmail farm cluster: [prefix]"

## Phan 3: Nang cap Fingerprint v2

### File: `src/utils/deviceFingerprint.ts`
Thay the thuat toan hien tai (7 tin hieu co ban) bang v2 voi:
- **Canvas Fingerprint**: Ve text + arc len canvas an, lay hash cua pixel data
- **WebGL Renderer**: Lay UNMASKED_VENDOR va UNMASKED_RENDERER tu GPU
- **Hardware chi tiet**: `deviceMemory`, `maxTouchPoints`, `devicePixelRatio`
- Giu lai cac tin hieu v1 de tuong thich nguoc
- Hash cuoi cung van la SHA-256, cat 32 ky tu

### File: `supabase/functions/log-login-ip/index.ts`
- Them truong `fingerprint_version` khi luu vao `pplp_device_registry`
- Doc `fingerprint_version` tu body request (mac dinh `1` neu khong co)

### Database Migration:
- Them cot `fingerprint_version` (integer, default 1) vao bang `pplp_device_registry`

## Phan 4: Tu dong phat hien email tuong tu

### File: `src/components/admin/WalletAbuseTab.tsx`
Them tab moi **"Email Farm"** trong giao dien Lam dung:

- Tu dong nhom cac tai khoan co email prefix giong nhau (loai bo so cuoi truoc `@gmail.com`)
- Hien thi: ten cum, so tai khoan, tong CAMLY, trang thai tung nick
- Nut "Cam tat ca" de ban hang loat
- Chi hien thi cac cum co >= 3 tai khoan

### File: `supabase/functions/log-login-ip/index.ts`
Them kiem tra email pattern khi dang nhap:
- Tach prefix email (bo so cuoi), kiem tra co >= 3 tai khoan cung prefix khong
- Neu phat hien, tu dong tao `pplp_fraud_signals` voi `signal_type = 'EMAIL_FARM'`
- Thong bao Admin

## Tom tat cac file thay doi:

1. `src/utils/deviceFingerprint.ts` — Nang cap v2 (Canvas + WebGL + Hardware)
2. `supabase/functions/log-login-ip/index.ts` — Them fingerprint_version + email pattern detection
3. `src/components/admin/WalletAbuseTab.tsx` — Them tab "Email Farm" voi tu dong nhom + ban hang loat
4. Database migration — Them cot `fingerprint_version`, duyet lai 3 tai khoan, ban farm accounts

