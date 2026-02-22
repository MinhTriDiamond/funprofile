
# Cap nhat so lieu va them nut xoa tai khoan

## Van de
Ca hai ham `get_user_directory_summary` va `get_user_directory_totals` deu goi `get_user_rewards_v2(10000)` - mot ham cuc ky nang, tinh toan phuc tap tren nhieu bang voi gioi han 10,000 dong. Day la nguyen nhan chinh gay cham trang.

## Giai phap

### 1. Sua ham `get_user_directory_summary` - Loai bo `get_user_rewards_v2`
- Thay CTE `reward_data` (goi `get_user_rewards_v2(10000)`) bang cach doc truc tiep tu cot `profiles.total_rewards`
- `camly_calculated` se lay tu `profiles.total_rewards` thay vi tinh toan lai
- `camly_today` se bo (hoac dat = 0) vi khong can thiet cho trang danh sach
- Dieu nay giam thoi gian tu 5-10 giay xuong duoi 1 giay

### 2. Sua ham `get_user_directory_totals` - Tuong tu
- Thay `SUM(r.total_reward) FROM get_user_rewards_v2(10000)` bang `SUM(p.total_rewards) FROM profiles p`
- Toan bo aggregation se chi dung cac bang don gian, khong goi ham nang

### 3. Nut xoa tai khoan
- Nut xoa da co san trong code cho admin (icon thung rac o cot cuoi)
- Dam bao nut nay hien thi dung va hoat dong cho tat ca admin
- Kiem tra lai logic `isAdmin` de dam bao admin thay duoc nut xoa

## Chi tiet ky thuat

### Migration SQL:
- `DROP FUNCTION` ca hai ham cu
- Tao lai `get_user_directory_summary()` voi `profiles.total_rewards` thay cho `get_user_rewards_v2`
- Tao lai `get_user_directory_totals()` voi `SUM(profiles.total_rewards)` thay cho `get_user_rewards_v2`

### Ket qua:
- Trang `/users` tai nhanh hon (duoi 1-2 giay)
- So lieu van chinh xac (dung du lieu snapshot tu `profiles.total_rewards`)
- Nut xoa hoat dong cho admin
