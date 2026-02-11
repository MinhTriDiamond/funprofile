
# Nang Cap The Chuc Mung Nhan Thuong (DonationReceivedCard)

## Tong quan
Cap nhat the chuc mung khi nguoi dung nhan duoc qua tang: doi mau nen sang xanh la tuoi sang, thay doi tieu de, them nhac Rich3.mp3 lap lai lien tuc, va bo sung hieu ung confetti + chu "RICH" 9 sac cau vong nhay mua khap man hinh.

---

## 1. Copy file nhac Rich3.mp3 vao du an

- Copy `user-uploads://Rich3.mp3` vao `public/sounds/rich-3.mp3` (thay the file cu neu co)

---

## 2. Cap nhat `src/lib/celebrationSounds.ts`

- Them ham `playCelebrationMusicLoop(soundId)` phat nhac lap lai lien tuc (loop = true)
- Ham tra ve HTMLAudioElement de co the dung lai khi dong card
- Cap nhat `playReceivedNotificationSound()` de su dung `rich-3` voi che do loop

---

## 3. Cap nhat `src/components/donations/DonationReceivedCard.tsx`

### 3a. Mau nen xanh la tuoi sang
- Doi gradient nen tu `#f0fdf4 -> #86efac` sang xanh la tuoi hon: `#d4f7dc -> #34d399 -> #10b981`
- Doi border glow sang xanh la tuoi: `#22c55e -> #10b981`

### 3b. Thay doi tieu de
- Doi tu "BAN NHAN DUOC QUA TANG!" thanh:
  "🎉✨ Chuc mung! Ban vua nhan duoc dong tien hanh phuc cua Cha va Be Angel CamLy! ✨🎉"
- Mau chu vang tuoi (#fbbf24 / amber-400) tren nen xanh

### 3c. Nhac Rich3.mp3 lap lai lien tuc
- Khi card mo: goi `playCelebrationMusicLoop('rich-3')` 
- Luu reference audioRef de dung nhac khi dong card
- Khi dong card: dung nhac (audio.pause())

### 3d. Them confetti + chu "RICH" 9 sac cau vong
- Truyen them props `showRichText={true}` cho DonationCelebration

---

## 4. Cap nhat `src/components/donations/DonationCelebration.tsx`

### 4a. Bo sung confetti ruc ro hon
- Tang particleCount len 80 moi dot
- Them nhieu mau cau vong: do, cam, vang, xanh la, xanh duong, tim, hong, trang, vang gold
- Giam interval tu 800ms xuong 600ms de ban lien tuc hon
- Them confetti burst tu center bottom (phao hoa phia duoi ban len)

### 4b. Them chu "RICH" 9 sac cau vong nhay mua
- Them 12-15 chu "RICH" voi cac mau cau vong khac nhau
- Moi chu co animation `animate-float-random` (bay lung lo khap man hinh)
- Font bold, kich thuoc lon (text-2xl den text-4xl), co text-shadow de noi bat
- Rotation ngau nhien va animation delay khac nhau de tao hieu ung dong

### 4c. Them phao hoa burst hieu ung
- Bo sung confetti kieu "firework" (ban tu phia duoi len roi no ra): `startVelocity: 45, gravity: 1.2, ticks: 200`
- Them dot ban phao hoa xen ke voi confetti thuong

---

## Chi tiet ky thuat

### celebrationSounds.ts - Ham moi:
```text
playCelebrationMusicLoop(soundId): HTMLAudioElement | null
  - audio.loop = true
  - audio.volume = 0.7
  - Tra ve audio element de caller co the .pause() khi can
```

### DonationCelebration - Confetti rainbow colors:
```text
const RAINBOW_COLORS = [
  '#FF0000', '#FF7700', '#FFD700', 
  '#00FF00', '#00BFFF', '#0000FF',
  '#8B00FF', '#FF69B4', '#FFFFFF'
];
```

### DonationCelebration - Firework burst:
```text
confetti({
  particleCount: 100,
  spread: 360,
  startVelocity: 45,
  gravity: 1.2,
  ticks: 200,
  origin: { x: Math.random(), y: 1 },
  colors: RAINBOW_COLORS
});
```

### DonationCelebration - Chu RICH nhay mua:
```text
15 phan tu <span> voi:
  - Noi dung: "RICH"  
  - Vi tri: ngau nhien (left, top %)
  - Mau: 1 trong 9 mau cau vong
  - Animation: float + rotate + scale pulse
  - Font: bold, text-2xl -> text-4xl
  - text-shadow: 0 0 10px currentColor
```

---

## Tong hop file can thay doi

| File | Thay doi |
|------|----------|
| `public/sounds/rich-3.mp3` | Copy file nhac moi tu user upload |
| `src/lib/celebrationSounds.ts` | Them ham `playCelebrationMusicLoop`, cap nhat `playReceivedNotificationSound` |
| `src/components/donations/DonationCelebration.tsx` | Them confetti rainbow, phao hoa burst, chu "RICH" 9 sac nhay mua |
| `src/components/donations/DonationReceivedCard.tsx` | Doi mau xanh la tuoi, doi tieu de, nhac loop rich-3, dung nhac khi dong |
