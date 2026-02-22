

# Toi uu hieu nang trang Danh sach Thanh vien (/users)

## Van de hien tai

Trang `/users` hien tai thuc hien **5 truy van dong thoi** tu client, bao gom mot RPC rat nang (`get_user_rewards_v2` voi limit 10,000 - thuc hien tinh toan phuc tap tren nhieu bang). Sau do, toan bo du lieu (593 profiles, 847 donations, 238 claims...) duoc tai ve client va xu ly bang JavaScript. Dieu nay gay:
- Thoi gian tai trang rat cham
- Timeout hoac loi khi mang yeu
- Hien thi 0/0 thanh vien khi du lieu chua tai xong

## Giai phap: Tao database function `get_user_directory_summary`

Thay vi 5 truy van rieng le + xu ly client-side, tao **1 function duy nhat** phia server lam tat ca aggregation va tra ve ket qua da xu ly.

### Buoc 1: Tao database function moi

Function `get_user_directory_summary()` se:
- JOIN profiles voi light_reputation, reward_claims, donations trong 1 truy van
- Tinh toan tat ca stats (posts_count, comments_count, camly_calculated, internal_sent/received, web3_sent/received...) phia server
- Tra ve danh sach users da co du thong tin, khong can xu ly them o client
- Su dung SECURITY DEFINER de dam bao hoat dong cho ca anon va authenticated
- **KHONG goi `get_user_rewards_v2`** - thay vao do chi lay du lieu can thiet tu `profiles`, `light_reputation`, `reward_claims`, `donations`, va dem `posts`/`comments` truc tiep

### Buoc 2: Tao function `get_user_directory_totals`

Function rieng cho stats tong hop (tong users, tong CAMLY, tong posts...) de hien thi cac StatCard o dau trang. Function nay nhe hon vi chi tra ve 1 row aggregate.

### Buoc 3: Cap nhat `useUserDirectory.ts`

- Thay the 5 truy van hien tai bang 2 RPC calls: `get_user_directory_summary` va `get_user_directory_totals`
- Giu nguyen logic filter/search/pagination o client (vi du lieu da nhe hon nhieu)
- Tang staleTime len 10 phut de giam so lan goi lai

### Buoc 4: Loai bo realtime subscription khong can thiet

Hien tai hook subscribe realtime tren `donations` va `reward_claims` - moi thay doi se invalidate toan bo user-directory query. Day la nguyen nhan gay re-fetch lien tuc. Se chuyen sang chi invalidate khi user thuc hien hanh dong cu the (vi du sau khi claim/donate).

## Chi tiet ky thuat

### Database function `get_user_directory_summary`:

```text
Tra ve: id, username, full_name, avatar_url, public_wallet_address, 
        created_at, is_banned, pending_reward, approved_reward,
        posts_count, comments_count, total_light_score, tier, total_minted,
        camly_calculated (tu reward snapshot hoac tinh don gian),
        camly_claimed, internal_sent, internal_received, 
        web3_sent, web3_received

Cach tinh:
- posts_count: COUNT tu bang posts
- comments_count: COUNT tu bang comments (join posts)
- camly_claimed: SUM(amount) tu reward_claims
- internal/web3 sent/received: SUM(amount) tu donations GROUP BY sender/recipient + is_external
- total_light_score, tier, total_minted: tu light_reputation
```

### Thay doi trong `useUserDirectory.ts`:
- Thay `fetchUserDirectory` goi 1 RPC `get_user_directory_summary` 
- Thay stats calculation bang RPC `get_user_directory_totals`
- Xoa realtime subscription (chuyen sang manual invalidation)
- Giu nguyen search/filter/pagination logic

### Ket qua mong doi:
- Giam tu 5 network requests xuong 2
- Toan bo aggregation chay tren server (nhanh hon nhieu)
- Khong con goi `get_user_rewards_v2` nang ne
- Trang tai trong 1-2 giay thay vi 5-10 giay+
- Hoat dong tot cho ca guest va authenticated users
