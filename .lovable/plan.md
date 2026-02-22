

# Go bo co sai va vo hieu hoa Fingerprint v1

## Tinh trang hien tai

- **5 tai khoan bi on_hold oan**: phuong_loan79, vutrongvan931b5dv3, vanphuctruong6026z2l1y, Angelkieuphi_2, dinhtunghp19554j5x24 - tat ca deu bi on_hold vi fingerprint v1 nham nhan dien cung thiet bi
- **Fingerprint v1 trong database**: 217 ban ghi, 137 device hash, 160 user - tat ca deu la du lieu khong dang tin cay
- **23 device hash v1 dang bi flagged** - co the gay ban oan them

## Giai phap

### 1. Go on_hold cho 5 tai khoan (Data update)

Dat lai `reward_status` thanh `pending` va xoa `admin_notes` cho 5 tai khoan bi on_hold oan.

### 2. Unflag tat ca device hash v1 (Data update)

Dat `is_flagged = false` va xoa `flag_reason` cho tat ca ban ghi co `fingerprint_version = 1` de khong con anh huong den bat ky user nao.

### 3. Bo qua fingerprint v1 trong Edge Function `log-login-ip` (Code change)

Sua ham `handleDeviceFingerprint` de chi xu ly khi `fingerprint_version >= 2`. Neu client gui v1 (hoac khong gui version), se bo qua hoan toan - khong luu, khong kiem tra, khong flag.

### 4. Bo qua v1 trong `daily-fraud-scan` (Code change)

Them dieu kien `fingerprint_version >= 2` khi truy van `pplp_device_registry` de khong quet cac device hash v1 khong dang tin cay.

## Tac dong

- 5 tai khoan bi oan se duoc khoi phuc trang thai binh thuong
- Tat ca 23 device hash v1 bi flagged se duoc go co
- He thong se chi su dung fingerprint v2 (co do chinh xac cao hon) de phat hien gian lan
- Du lieu v1 cu van giu trong database de tham khao nhung khong duoc su dung de flag/ban

