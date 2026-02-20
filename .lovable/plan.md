

## Tản Deu Cac O Lien Ket Mang Xa Hoi Quanh Avatar

### Van De Hien Tai
Ham `computeAngles` dang phan bo cac icon trong mot cung toi da 260 do (tap trung phia duoi avatar), khien cac icon bi don ve mot phia khi so luong it.

### Giai Phap
Thay doi ham `computeAngles` de phan bo deu cac icon quanh toan bo vong tron 360 do. Nhu vay, bat ke co bao nhieu icon, chung se cach deu nhau va nhin can doi, sang dep hon.

### Chi Tiet Ky Thuat

**File:** `src/components/profile/AvatarOrbit.tsx`

1. **Sua ham `computeAngles`**: Thay vi phan bo tren cung 260 do, chuyen sang phan bo deu 360 do:
   - Goc bat dau tu phia tren (0 do = 12 gio)
   - Moi icon cach nhau `360 / n` do
   - Voi 9 icon: moi icon cach nhau 40 do
   - Voi 3 icon: moi icon cach nhau 120 do

2. **Sua ham `computeAddAngle`**: Cap nhat de nut "+" (them icon moi) cung nam tren vong tron 360 do, o vi tri ke tiep hop ly.

Khong co thay doi nao khac - giao dien, kich thuoc icon, hieu ung xoay, keo tha deu giu nguyen.

