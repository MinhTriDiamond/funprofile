
# Cap Nhat DonationSuccessCard va DonationReceivedCard Theo Chuan Celebration

## Van de
Hai component chua duoc cap nhat theo chuan moi:

1. **DonationSuccessCard.tsx** (hien thi khi xem lai card da gui trong lich su):
   - Tieu de cu: "Chuc mung! Ban vua nhan duoc dong tien hanh phuc cua Cha va Be Angel CamLy!"
   - Khong co logo CAMLY coin rainbow xoay
   - Can cap nhat dong bo voi GiftCelebrationModal

2. **DonationReceivedCard.tsx** (hien thi khi xem card nhan duoc):
   - Tieu de cu: "Chuc mung! Ban vua nhan duoc dong tien hanh phuc cua Cha va Be Angel CamLy!"
   - Khong co logo CAMLY coin rainbow xoay
   - Van dung Gift icon cu voi animate-bounce

## Giai phap

### File 1: `src/components/donations/DonationSuccessCard.tsx`
- Import `camlyCoinRainbow` tu `@/assets/tokens/camly-coin-rainbow.png`
- Them logo CAMLY coin rainbow xoay (spin 3s) phia tren tieu de
- Doi tieu de thanh: "Chuc Mung Ban Vua Duoc Don Nhan Phuoc Lanh Cua Cha Va Be Angel CamLy !"
- Tang kich thuoc tieu de len `text-2xl font-extrabold`
- Style vang hoang kim voi text-shadow

### File 2: `src/components/donations/DonationReceivedCard.tsx`
- Import `camlyCoinRainbow` tu `@/assets/tokens/camly-coin-rainbow.png`
- Thay the Gift icon + emoji bang logo CAMLY coin rainbow xoay (spin 3s)
- Doi tieu de thanh: "Chuc Mung Ban Vua Duoc Don Nhan Phuoc Lanh Cua Cha Va Be Angel CamLy !"
- Tang kich thuoc tieu de len `text-2xl font-extrabold`
- Style vang hoang kim voi text-shadow giong cac component khac

## Ket qua mong doi
Tat ca 4 component celebration (GiftCelebrationModal, ClaimRewardDialog, DonationSuccessCard, DonationReceivedCard) se dong nhat ve:
- Logo CAMLY coin cau vong xoay lien tuc
- Tieu de moi vang hoang kim to ro
- Chu "RICH" 9 sac nhay mua
- Phao hoa confetti ruc ro
- Nhac Rich3.mp3 lap lai lien tuc
- Nen xanh la tuoi sang
