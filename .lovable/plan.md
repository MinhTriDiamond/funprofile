
# Mo khoa 2 tai khoan: phuongloan79 va wallet_75468294ldfa

## Muc tieu
Chuyen trang thai `reward_status` cua 2 tai khoan tu `on_hold` ve `approved` de ho co the tiep tuc nhan thuong binh thuong.

## Tai khoan can mo khoa

| Username | ID | Trang thai hien tai |
|---|---|---|
| phuongloan79 | d38fcba7-74df-472e-8e0e-b3ccea1e5aa7 | on_hold |
| wallet_75468294ldfa | 0695b7ac-e04a-44a7-9b7a-062c28f52f45 | on_hold |

## Thao tac

1. Cap nhat `reward_status` tu `on_hold` thanh `approved` cho ca 2 tai khoan trong bang `profiles`.
2. Ghi log vao bang `audit_logs` de luu vet hanh dong mo khoa cua Admin.

## Chi tiet ky thuat

Chay 1 migration SQL:

```sql
-- Mo khoa 2 tai khoan
UPDATE profiles
SET reward_status = 'approved'
WHERE id IN (
  'd38fcba7-74df-472e-8e0e-b3ccea1e5aa7',
  '0695b7ac-e04a-44a7-9b7a-062c28f52f45'
);
```

Dong thoi ghi audit log trong code (thong qua Supabase client) de dam bao truy vet duoc ai da mo khoa va khi nao.
