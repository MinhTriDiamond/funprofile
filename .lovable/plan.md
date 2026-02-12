

# Chinh Sua Hieu Ung An Mung: Logo Xoay, Chu RICH Sac Net, Nen Xanh La

## Tong quan
Chinh sua 3 component (GiftCelebrationModal, ClaimRewardDialog, ClaimFunDialog) va DonationCelebration de:
1. Logo CAMLY coin xoay tron (spin) thay vi nhun nhay (bounce)
2. Chu "RICH" sac net hon (bot nhoe), noi bat tren khung card
3. Doi tieu de thanh: "Chuc Mung Ban Vua Duoc Don Nhan Phuoc Lanh Cua Cha Va Be Angel CamLy !"
4. Tieu de to hon va ro net hon
5. Nen khung bao nhan thuong doi thanh mau xanh la cay tuoi sang

## Chi tiet ky thuat

### 1. File `src/components/donations/DonationCelebration.tsx`
- **Chu RICH sac net hon**: Giam `textShadow` tu glow rong (10px + 20px) xuong shadow nhe hon (2px + 4px) de chu khong bi nhoe
- **Them `-webkit-text-stroke`** de vien chu sac net
- **Tang z-index** cua container RICH text len `z-[200]` de noi bat tren card (card la z-50)

### 2. File `src/components/donations/GiftCelebrationModal.tsx`
- **Logo CAMLY**: Doi tu `animate-bounce` sang `animate-spin` (xoay lien tuc) voi toc do cham (`animation: spin 3s linear infinite`)
- **Tieu de**: Doi noi dung thanh "Chuc Mung Ban Vua Duoc Don Nhan Phuoc Lanh Cua Cha Va Be Angel CamLy !"
- **Tieu de to hon**: Tang tu `text-lg` len `text-2xl`, tang `font-extrabold` giu nguyen
- **Nen card**: Doi `background: currentBg` (tu theme) thanh gradient xanh la tuoi `linear-gradient(135deg, #34d399, #10b981)`
- **Border glow**: Doi mau accent thanh xanh la `#10b981`

### 3. File `src/components/wallet/ClaimRewardDialog.tsx`
- **Logo CAMLY**: Doi tu `animate-bounce` sang spin cham (3s)
- **Tieu de**: Doi noi dung giong GiftCelebrationModal
- **Tieu de to hon**: Tang len `text-2xl`

### 4. File `src/components/wallet/ClaimFunDialog.tsx`
- **Logo CAMLY**: Doi tu `animate-bounce` sang spin cham (3s)
- **Tieu de**: Doi noi dung giong tren
- **Tieu de to hon**: Tang len `text-2xl`

### 5. File `tailwind.config.ts`
- Them animation `spin-celebration` (3s) neu can, hoac dung `animate-[spin_3s_linear_infinite]` truc tiep

## Ket qua mong doi
- Logo CAMLY coin xoay tron lien tuc (giong video tham khao)
- Chu "RICH" sac net, khong nhoe, noi bat tren card
- Tieu de moi: "Chuc Mung Ban Vua Duoc Don Nhan Phuoc Lanh Cua Cha Va Be Angel CamLy !"
- Tieu de to, ro net voi mau vang hoang kim
- Nen khung mau xanh la cay tuoi sang
