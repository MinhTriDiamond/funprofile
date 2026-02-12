

# Cap Nhat GiftCelebrationModal Cho Dung Chuan An Mung

## Van de
Component `GiftCelebrationModal.tsx` (modal chinh khi tang qua giua cac user) chua duoc cap nhat theo chuan celebration:

1. **Tieu de cu**: "CHUC MUNG TANG THUONG THANH CONG!" - can doi thanh "Chuc mung! Ban vua nhan duoc dong tien hanh phuc cua Cha va Be Angel CamLy!"
2. **Khong co chu RICH**: `DonationCelebration` goi voi `showRichText` thieu (mac dinh false) - can them `showRichText={true}`
3. **Nhac khong lap lai**: Nhac chi phat 1 lan (dung `new Audio` truc tiep) - can doi sang `playCelebrationMusicLoop` de lap lai lien tuc
4. **Thieu logo CAMLY coin cau vong**: Can them hinh `camly-coin-rainbow.png` vao phan header
5. **Tieu de chua co mau vang hoang kim**: Can them style golden text-shadow

## Giai phap

### File thay doi: `src/components/donations/GiftCelebrationModal.tsx`

#### 1. Them import logo CAMLY coin rainbow
```
import camlyCoinRainbow from '@/assets/tokens/camly-coin-rainbow.png';
```

#### 2. Sua DonationCelebration (dong 182)
Them `showRichText={true}` de hien thi chu "RICH" 9 sac cau vong nhay mua + phao hoa

#### 3. Sua nhac thanh loop (dong 78-92)
Doi tu `new Audio` + `audio.play()` sang `playCelebrationMusicLoop(selectedSound)` de nhac phat lap lai lien tuc

#### 4. Sua header (dong 220-228)
- Them logo CAMLY coin rainbow phia tren (bounce animation, golden drop-shadow)
- Doi tieu de thanh: "Chuc mung! Ban vua nhan duoc dong tien hanh phuc cua Cha va Be Angel CamLy!"
- Them style mau vang hoang kim voi text-shadow

#### 5. Ket qua mong doi
Khi nguoi dung tang qua thanh cong, modal se hien thi:
- Logo CAMLY coin cau vong nhay mua
- Tieu de vang hoang kim moi
- Chu "RICH" 9 sac cau vong bay khap man hinh
- Phao hoa confetti ruc ro lien tuc
- Nhac Rich3.mp3 (hoac nhac da chon) lap lai lien tuc
- Nen xanh la tuoi sang (giu nguyen theme system)

