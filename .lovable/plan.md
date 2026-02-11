
# Trang Danh Sach Thanh Vien - Chuong trinh Li Xi 26 ty

## Tong quan
Tao trang `/users` hien thi danh sach tat ca thanh vien voi day du thong tin: hoat dong, diem Anh Sang (Light Score), thuong CAMLY, USDT, va cac so lieu lien quan. Phuc vu chuong trinh Li Xi 26.000.000.000 dong. Giao dien phong cach Li Xi (do va vang gold).

---

## 1. Tao hook du lieu: `src/hooks/useUserDirectory.ts`

Hook nay gop du lieu tu nhieu nguon:
- **RPC `get_user_rewards_v2`**: Lay thong tin hoat dong (posts, comments, reactions, friends, shares, livestreams) va tong thuong CAMLY tinh toan
- **Bang `profiles`**: Lay username, avatar, wallet address, `pending_reward`, `approved_reward`, `reward_status`
- **Bang `reward_claims`**: Lay so CAMLY da claim (da thuong thuc te)
- **Bang `light_reputation`**: Lay Light Score, Tier, FUN Minted
- **Bang `donations`**: Tong hop thuong USDT/BTCB nhan duoc

### Tinh nang:
- Tim kiem theo username
- Phan trang (50 user/trang)
- Xuat CSV
- Tinh tong thong ke toan he thong

---

## 2. Tao trang: `src/pages/Users.tsx`

Layout giong trang Benefactors (Navbar + Content + MobileBottomNav)

### Header
- Tieu de: "DANH SACH THANH VIEN" voi icon Gift va mau do/vang Li Xi
- Phu de: "Chuong trinh Li Xi 26.000.000.000 dong"

### Stats Cards (4 the tren cung)
- Tong thanh vien
- Tong CAMLY da tinh toan (tu rewards v2)
- Tong CAMLY da thuong (tu reward_claims)
- Tong Light Score

### Bo loc
- O tim kiem (theo username)
- Nut xuat CSV

### Bang danh sach (moi dong 1 user)

| Cot | Du lieu |
|-----|---------|
| # | So thu tu |
| User | Avatar + username + wallet address rut gon (link BscScan) |
| Hoat dong | Posts, Comments nhan duoc, Reactions nhan duoc, Friends, Shares |
| Light Score | Total Score, Tier (New Soul / Light Seeker / Light Bearer / Light Guardian), FUN Minted |
| CAMLY | So tinh toan (tu get_user_rewards_v2) / So da thuong (tu reward_claims) / Trang thai (pending/approved) |
| USDT | Tong USDT nhan tu donations (neu co) |

---

## 3. Them route `/users` vao App.tsx

- Them `const Users = lazy(() => import("./pages/Users"));`
- Them route: `<Route path="/users" element={<Users />} />`

---

## 4. Them lien ket vao Sidebar

### File: `src/components/feed/FacebookLeftSidebar.tsx`
- Them muc "Danh Sach Thanh Vien" vao `shortcutItems`, dat sau "Lich Su Giao Dich"
- Icon: `UsersRound` (da import san)
- Path: `/users`
- Color: `text-red-500` (mau do Li Xi)

---

## Chi tiet ky thuat

### useUserDirectory.ts - Query chinh:
```text
1. Goi get_user_rewards_v2(10000) de lay tat ca user voi activity stats
2. Goi profiles select (username, avatar_url, public_wallet_address, custodial_wallet_address, pending_reward, approved_reward, reward_status)
3. Goi reward_claims group by user_id de tinh da claim
4. Goi light_reputation (total_light_score, tier, total_minted)
5. Goi donations (token_symbol = 'USDT', group by recipient_id) de tinh USDT nhan
6. Gop tat ca du lieu lai theo user_id
```

### CSV Export:
```text
Headers: STT, Username, Wallet, Posts, Comments, Reactions, Friends, Shares, Light Score, Tier, FUN Minted, CAMLY Tinh Toan, CAMLY Da Thuong, Trang Thai, USDT
```

---

## Tong hop file can tao/sua

| File | Thao tac |
|------|----------|
| `src/hooks/useUserDirectory.ts` | **Tao moi** - Hook lay va gop du lieu tu nhieu nguon |
| `src/pages/Users.tsx` | **Tao moi** - Trang danh sach thanh vien phong cach Li Xi |
| `src/App.tsx` | **Sua** - Them lazy import va route /users |
| `src/components/feed/FacebookLeftSidebar.tsx` | **Sua** - Them muc "Danh Sach Thanh Vien" vao shortcutItems |
