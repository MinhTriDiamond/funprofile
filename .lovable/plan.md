
# Them Huong Dan Mint FUN Money cho User

## Tong quan
Them mot component huong dan (guide/tutorial) ngay phia tren LightScoreDashboard trong trang `/wallet/fun_money`, giai thich chi tiet quy trinh mint FUN Money theo cac buoc don gian, de hieu cho nguoi dung.

## Thiet ke

Tao mot Card collapsible (co the dong/mo) voi tieu de "Huong Dan Mint FUN Money" hien thi phia tren cac card hien tai. Mac dinh **mo** lan dau, va luu trang thai dong/mo vao localStorage de khong hien lai moi lan.

### Noi dung huong dan gom 5 buoc:

1. **Tao Light Activities** - Dang bai, binh luan, tha cam xuc de tich diem FUN
2. **Tich du 200 FUN** - Can toi thieu 200 FUN de du dieu kien mint (toi da 2 lan/ngay)
3. **Nhan "Mint FUN"** - He thong gui yeu cau len Admin de ky duyet
4. **Admin ky duyet** - 3 Attester ky xac nhan (WILL-WISDOM-LOVE), FUN duoc gui len blockchain
5. **Activate & Claim** - Chuyen FUN tu Locked thanh Activated, roi Claim ve vi

Moi buoc co icon, tieu de, mo ta ngan gon. Style phu hop voi theme hien tai (amber/gold gradient).

## Chi tiet ky thuat

### File tao moi:
- `src/components/wallet/FunMoneyGuide.tsx` — Component huong dan collapsible

### File cap nhat:
- `src/components/wallet/tabs/FunMoneyTab.tsx` — Import va dat FunMoneyGuide phia tren MemoizedLightScoreDashboard

### Cau truc FunMoneyGuide:
- Su dung Card + Collapsible (hoac state toggle don gian)
- 5 buoc hien thi dang timeline doc (numbered steps)
- Nut "An huong dan" / "Xem huong dan" de toggle
- Luu trang thai vao localStorage key `fun-money-guide-dismissed`
- Su dung cac icon tu lucide-react: BookOpen, FileText, Coins, Shield, Wallet
- Responsive, hien thi tot tren mobile

### Tone & ngon ngu:
- Tieng Viet, than thien, de hieu
- Khong dung thuat ngu ky thuat phuc tap (vi du: noi "ky duyet" thay vi "EIP-712 signing")
- Co emoji de sinh dong
