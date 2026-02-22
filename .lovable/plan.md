
# Fix loi "column reference 'created_at' is ambiguous" trong get_user_directory_summary

## Nguyen nhan
Ham `get_user_directory_summary` khai bao `created_at` trong `RETURNS TABLE` (dong 11). Trong PL/pgSQL, ten cot output duoc coi la bien cuc bo. Khi cac subquery trong CTE `old_stats` (dong 70-74) dung `created_at` ma khong co table alias, PostgreSQL khong biet do la cot cua bang hay bien PL/pgSQL -> loi "ambiguous".

Cu the cac dong loi:
- Dong 70: `created_at < cutoff_date` (trong subquery tu bang `posts`) 
- Dong 71: `r.created_at` OK nhung co `created_at` an
- Dong 72: `c.created_at` OK
- Dong 73: `sp.created_at` OK  
- Dong 74: `created_at < cutoff_date` (trong subquery tu bang `friendships`) - **KHONG CO ALIAS**

## Giai phap
Tao migration moi de sua ham, them table alias cho tat ca cac `created_at` khong co alias trong CTE `old_stats`:

1. Dong 70: `AND created_at < cutoff_date` -> `AND posts.created_at < cutoff_date`
2. Dong 74: `AND created_at < cutoff_date` -> `AND friendships.created_at < cutoff_date`

Chi can 1 migration SQL nho de DROP va tao lai ham voi cac reference da duoc qualify day du.

## Chi tiet ky thuat
- File: Migration SQL moi
- Thay doi: Them table alias cho cac `created_at` bi ambiguous trong CTE `old_stats`
- Khong thay doi logic tinh toan, chi fix syntax
