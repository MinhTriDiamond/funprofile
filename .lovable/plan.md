
# Cap nhat giao dien Light Community tren trang chu (sidebar)

## Muc tieu
Dong bo giao dien component `TopRanking` (sidebar ben phai trang chu) voi thiet ke moi cua trang Leaderboard: card-based, badge outlined, gradient cau vong, hien thi display_name.

## Thay doi trong `src/components/feed/TopRanking.tsx`

### 1. Cap nhat interface
- Them truong `display_name` vao `LightCommunityMember` interface (giong Leaderboard)

### 2. Thay doi style tieu de
- Doi gradient xanh la thanh gradient cau vong (rainbow) giong trang Leaderboard
- Them icon Sparkles va Users ben canh tieu de
- Bo logo FUN Profile phia tren (giu gon)

### 3. Cap nhat member card
- Doi tu row xanh la sang card trang voi border, rounded, shadow (giong Leaderboard)
- Them light emoji icon (tron, ben trai)
- Hien thi `display_name || username` lam ten chinh, `@username` phia duoi
- Badge outlined voi mau tuong ung (purple/rose/emerald/sky) thay vi badge filled xanh

### 4. Cap nhat nut CTA
- Doi mau nut tu xanh la sang style trung tinh/gradient phu hop

### Tom tat ky thuat
- Chi sua 1 file: `src/components/feed/TopRanking.tsx`
- Khong can thay doi database (RPC da tra ve `display_name`)
