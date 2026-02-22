

# Giai thich va sua loi so lieu khong khop giua User Directory va Trang Ca nhan

## Giai thich cac cot trong bang User Directory

| Cot | Y nghia | Cach tinh |
|-----|---------|-----------|
| Bai/BL | So bai dang / Binh luan nhan | Dem TAT CA bai dang cua user / Dem TAT CA binh luan tren bai cua user |
| Anh sang | Light Score va cap do (Light Bearer, etc.) | Tu bang `light_reputation` |
| So du | Pending / Approved reward | Tu `profiles.pending_reward` va `profiles.approved_reward` |
| Tong thuong | Tong CAMLY tinh toan | Tu `profiles.total_rewards` (snapshot) |
| FUN | FUN Money da duc | Tu `light_reputation.total_minted` |
| Tang NB | Tang noi bo gui/nhan | Tu bang `donations` (is_external = false) |
| Tang Web3 | Tang Web3 gui/nhan | Tu bang `donations` (is_external = true) |
| Da rut | Tong CAMLY da rut | Tu bang `reward_claims` |

## Van de chinh: 2 ham tinh khac nhau

### User Directory (`get_user_directory_summary`):
- posts_count = **1014** (dem TAT CA bai, khong loc)
- comments_count = **713** (dem TAT CA binh luan, khong gioi han do dai)
- Tong thuong = **12,320,000** (tu `profiles.total_rewards` - gia tri snapshot cu)

### Trang Ca nhan (`get_user_honor_stats`):
- posts_count = **883** (ap dung daily cap 10 bai/ngay + chi dem bai reward-eligible)
- comments_count = **706** (ap dung daily cap 50/ngay + chi dem binh luan > 20 ky tu)
- Tong thu = **7,568,000** (tinh tu cac so lieu da cap)

### Nguyen nhan lech:
1. **Bai dang**: User Directory dem tat ca 1014 bai, nhung Honor Board chi tinh toi da 10 bai/ngay va loc bai khong du dieu kien -> 883
2. **Binh luan**: User Directory dem tat ca 713 binh luan, nhung Honor Board chi tinh binh luan > 20 ky tu va cap 50/ngay -> 706
3. **Tong thuong**: `profiles.total_rewards` (12,320,000) la gia tri snapshot khong dong bo voi cach tinh moi cua Honor Board (7,568,000)

## Giai phap: Dong bo User Directory voi Honor Board

### Thay doi 1: Sua ham `get_user_directory_summary`
- **posts_count**: Thay `COUNT(*)` bang logic tuong tu Honor Board (daily cap 10, chi dem reward-eligible)
- **comments_count**: Thay `COUNT(*)` bang logic tuong tu Honor Board (daily cap 50, chi dem > 20 ky tu)
- **camly_calculated**: Thay `profiles.total_rewards` bang cach goi `get_user_honor_stats(p.id)` de lay `total_reward`, HOAC tinh truc tiep bang cung cong thuc

### Thay doi 2 (Phuong an toi uu hon): Su dung `get_user_honor_stats` truc tiep
Vi ham `get_user_honor_stats` da co logic chinh xac, ta co the:
- Goi `get_user_honor_stats` cho moi user trong `get_user_directory_summary` (nhung se cham vi goi 593 lan)
- HOAC inline logic cua Honor Board vao `get_user_directory_summary` (phuc tap nhung nhanh)

### De xuat: Phuong an can bang
- **posts_count** va **comments_count** trong User Directory se dung **so lieu thuc** (raw count) de cho thay tong hoat dong thuc te cua user - khong ap daily cap
- **camly_calculated** (Tong thuong) se duoc tinh lai theo cung cong thuc voi Honor Board (voi daily cap) de dam bao khop voi trang ca nhan
- Nhu vay: Bai/BL cho thay tong hoat dong, Tong thuong cho thay so CAMLY chinh xac

## Chi tiet ky thuat

### Migration SQL:
1. DROP va tao lai `get_user_directory_summary()`:
   - Giu nguyen posts_count va comments_count la raw count (hien thi hoat dong thuc)
   - Thay `camly_calculated = profiles.total_rewards` bang cach tinh inline giong `get_user_honor_stats` (ap daily cap cho reward calculation)
   - Logic tinh: inline CTE cho old stats (truoc cutoff 2026-01-15) + new stats (sau cutoff, voi daily cap) + cong thuc reward

2. Cac cot khac giu nguyen vi da chinh xac (donations, reward_claims, light_reputation)

### Luu y:
- Ham se cham hon 1 chut vi can tinh reward cho moi user, nhung van nhanh hon goi `get_user_rewards_v2`
- Gia tri `profiles.total_rewards` KHONG duoc cap nhat -> can dung cong thuc truc tiep
