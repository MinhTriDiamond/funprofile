

# Chuyen doi trang Leaderboard thanh Light Community

## Muc tieu
Khi nhan "Kham pha cong dong anh sang", trang Leaderboard hien tai van dung giao dien cu (xep hang canh tranh, diem so, podium vang). Can chuyen doi toan bo trang `/leaderboard` sang thiet ke Light Community — dong bo voi sidebar.

## Thay doi trong `src/pages/Leaderboard.tsx`

### 1. Thay doi data source
- Thay `get_user_rewards_v2` bang `get_light_community` (voi `p_limit: 100`)
- Thay interface `LeaderboardUser` bang `LightCommunityMember` (giong TopRanking.tsx)

### 2. Thay doi Header
- Thay Trophy icon vang thanh logo Fun Profile + tieu de "LIGHT COMMUNITY" (gradient xanh la)
- Thay subtitle thanh "Cong dong anh sang cua FUN Profile"
- Doi mau header tu `from-primary to-gold` sang `from-emerald-600 to-emerald-800`

### 3. Bo category tabs
- Xoa toan bo phan category tabs (Tong Thuong, Hom nay, Bai viet...) vi Light Community khong phan loai canh tranh

### 4. Bo podium Top 3
- Xoa toan bo phan Top 3 podium (voi so thu tu 1, 2, 3 va diem so)

### 5. Thay doi danh sach thanh vien
- Bo so thu tu xep hang va rank icons (Trophy, Medal, Award)
- Moi dong hien thi: Avatar + Username + Trend indicator + Light Level badge
- Dung cung style mau xanh la nhu TopRanking sidebar (emerald/teal/green/lime badges)
- Bo hien thi diem so, thay bang Light Level badge ben phai

### 6. Thay doi tieu de bang
- "Bang xep hang day du" thanh "Thanh vien cong dong"

### Ket qua
Trang Leaderboard se co giao dien dong nhat voi bang Light Community tren sidebar — khong diem so, khong xep hang, chi hien thi Light Level va xu huong tang truong.
