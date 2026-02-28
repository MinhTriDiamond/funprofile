

# Thiet ke lai trang Light Community theo mau moi

## Tong quan
Thiet ke lai toan bo trang `/leaderboard` theo dung mau screenshot: header trang sang (khong nen xanh), tieu de gradient cau vong, moi thanh vien la 1 card rieng biet voi display_name + @username, va badge outlined ben phai.

## Thay doi 1: Cap nhat RPC `get_light_community` (Database migration)
Them truong `display_name` vao ket qua tra ve cua RPC de hien thi ten hien thi va @username rieng biet.

## Thay doi 2: Thiet ke lai `src/pages/Leaderboard.tsx`

### Header moi:
- Bo gradient xanh la, thay bang nen trang/sang
- Nut back (ArrowLeft) ben trai
- Tieu de "LIGHT COMMUNITY" voi gradient cau vong (rainbow) giong mau, font Playfair Display
- Them icon sparkle va people ben canh tieu de
- Subtitle: "Nhung nguoi dong gop ben vung trong he sinh thai FUN Profile"
- Nut "Cap nhat" (refresh) o goc phai tren

### Danh sach thanh vien:
- Moi thanh vien la 1 card rieng biet (border, rounded, padding) thay vi dong trong bang
- Layout moi card: Light emoji icon (tron, ben trai) | Avatar | Ten hien thi (bold) + @username (nho, xam) | Light Level badge (ben phai, style outlined voi mau tuong ung)
- Badge dung style outlined (border mau, text mau, nen trong suot hoac nhat) thay vi filled
- Bo trend emoji/text ra khoi hien thi (thay vao do dung light emoji lam icon ben trai)

### Interface update:
- Them `display_name` vao interface `LightCommunityMember`

## Thay doi 3: Cap nhat mau badge
- Light Guardian: border do/hong, text do/hong (theo mau screenshot)
- Light Builder: border xanh la, text xanh la
- Light Architect: border tim/xanh, text tim/xanh
- Light Sprout: border xanh nhat, text xanh nhat
- Style: `border rounded-full px-4 py-1` — outlined, khong filled

## Tong ket file can sua:
1. Database migration — Cap nhat RPC `get_light_community` them `display_name`
2. `src/pages/Leaderboard.tsx` — Thiet ke lai toan bo giao dien

