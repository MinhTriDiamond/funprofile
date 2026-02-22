

## Dinh chi 4 tai khoan

Dat `is_restricted = true` va `reward_status = 'on_hold'` cho 4 user:
- susu
- phuong_loan79
- angelthanhthuy
- Angelkieuphi_2

### Thuc hien

Chay 1 lenh UPDATE duy nhat trong database:

```sql
UPDATE profiles 
SET is_restricted = true, reward_status = 'on_hold'
WHERE id IN (
  'bfc87ada-bfce-4a5e-a185-4e4b246b1a50',  -- susu
  'd38fcba7-74df-472e-8e0e-b3ccea1e5aa7',  -- phuong_loan79
  'f3d8831c-83b2-475a-a9ee-72d0f7d0c803',  -- angelthanhthuy
  '49fcc9b7-14cb-4e53-9b09-c3c6319db9cd'   -- Angelkieuphi_2
);
```

Ghi audit log cho moi user.

Khong can thay doi code hay database schema - chi cap nhat du lieu.

