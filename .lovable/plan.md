

# Nang Cap Trai Nghiem An Mung Cho Claim CAMLY va Claim FUN

## Tong quan
Bo sung hieu ung an mung day du cho ca hai man hinh Claim CAMLY va Claim FUN, bao gom: logo CAMLY coin cau vong, chu "RICH" 9 sac cau vong nhay mua, phao hoa confetti, nhac Rich3.mp3 lap lai lien tuc, nen xanh la tuoi sang, tieu de vang hoang kim.

## Tai nguyen can them

### Buoc 1: Copy file tai nguyen
- Copy `user-uploads://image-175.png` sang `src/assets/tokens/camly-coin-rainbow.png` (logo CAMLY coin voi vien cau vong)
- Copy `user-uploads://Rich3-3.mp3` sang `public/sounds/rich-3.mp3` (file nhac an mung)

## Thay doi code

### Buoc 2: Cap nhat ClaimRewardDialog.tsx (Claim CAMLY)
Thay the man hinh `renderSuccessStep()` (dong 255-287) tu giao dien don gian thanh trai nghiem an mung day du:

- Import them: `DonationCelebration`, `playCelebrationMusicLoop`, logo CAMLY coin rainbow
- Them state: `showCelebration` (boolean), `audioRef` (useRef cho nhac)
- Khi step = 'success':
  - Bat `DonationCelebration` voi `showRichText=true` (chu RICH 9 sac cau vong + phao hoa)
  - Phat nhac `rich-3.mp3` lap lai lien tuc
  - Hien thi card xanh la voi:
    - Logo CAMLY coin rainbow o tren cung
    - Tieu de vang: "Chuc mung! Ban vua nhan duoc dong tien hanh phuc cua Cha va Be Angel CamLy!"
    - So luong CAMLY da claim voi hieu ung phat sang
    - Nut BscScan va Dong
  - Khi dong dialog: dung nhac, tat hieu ung
- Xoa ham `triggerConfetti()` cu (dong 91-129) vi se dung DonationCelebration thay the

### Buoc 3: Cap nhat ClaimFunDialog.tsx (Claim FUN)
Bo sung trai nghiem an mung khi claim FUN thanh cong:

- Import them: `DonationCelebration`, `playCelebrationMusicLoop`, logo FUN
- Them state: `showSuccess` (boolean), `audioRef`
- Thay doi `useClaimFun` onSuccess: khong dong dialog ngay ma bat man hinh an mung
- Khi isSuccess = true:
  - Bat DonationCelebration voi showRichText=true
  - Phat nhac rich-3.mp3 lap lai
  - Hien thi overlay thanh cong voi logo FUN va thong bao
  - Chu vang hoang kim "Chuc mung! Ban vua nhan duoc dong tien hanh phuc!"
- Khi dong: dung nhac, tat hieu ung, dong dialog

## Chi tiet ky thuat

### ClaimRewardDialog - renderSuccessStep() moi

```text
+------------------------------------------+
|        [Logo CAMLY Coin Rainbow]         |
|                                           |
|  "Chuc mung! Ban vua nhan duoc dong      |
|   tien hanh phuc cua Cha va Be Angel     |
|   CamLy!" (mau vang, text-shadow)        |
|                                           |
|  +------------------------------------+  |
|  |  [So luong] CAMLY                   |  |
|  |  vao vi 0x1234...5678               |  |
|  +------------------------------------+  |
|  (nen xanh la gradient)                   |
|                                           |
|   [Xem BscScan]  [Dong]                 |
|                                           |
|   FUN Profile - Manh Thuong Quan         |
+------------------------------------------+
(nen gradient xanh la tuoi sang)
(DonationCelebration overlay: confetti + RICH + phao hoa)
(Nhac Rich3.mp3 phat lap lai lien tuc)
```

### Danh sach file thay doi
1. `src/assets/tokens/camly-coin-rainbow.png` - copy tu user upload
2. `public/sounds/rich-3.mp3` - copy tu user upload
3. `src/components/wallet/ClaimRewardDialog.tsx` - nang cap man hinh success
4. `src/components/wallet/ClaimFunDialog.tsx` - bo sung man hinh success

### Hieu ung an mung dong bo
- DonationCelebration component (da co san): confetti + phao hoa + chu "RICH" cau vong
- Nhac Rich3.mp3 phat lap lai lien tuc (playCelebrationMusicLoop)
- Tat tat ca khi nguoi dung dong card

