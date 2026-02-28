

# Doi mau icon 🏛️ thanh vang hoang kim

## Van de
Icon 🏛️ (Light Architect) hien thi mau den mac dinh cua emoji Unicode. Can doi thanh mau vang hoang kim dam de dong bo voi badge.

## Giai phap
Them logic render emoji voi CSS filter hoac styled container dua tren `light_level`. Khi level la "Light Architect", container emoji se co mau nen vang nhat va them CSS style `filter` de lam emoji co tong vang.

Tuy nhien vi emoji khong the doi mau bang CSS color, cach tot nhat la:
- Thay doi **background** cua vong tron emoji thanh gradient vang nhat (`bg-amber-100`) cho Light Architect
- Them style tuong ung cho cac level khac de nhat quan

## Thay doi trong 2 file

### `src/components/feed/TopRanking.tsx` va `src/pages/Leaderboard.tsx`
- Tao ham `getEmojiContainerStyle(level)` tra ve class mau nen cho vong tron emoji:
  - Light Architect: `bg-amber-100 border border-amber-400` (vang hoang kim)
  - Cac level khac: giu `bg-muted` nhu cu
- Ap dung vao div chua emoji

## Ky thuat
- Sua 2 file: `TopRanking.tsx` va `Leaderboard.tsx`
- Them ham helper `getEmojiContainerStyle`
- Thay class cua div emoji tu hardcode `bg-muted` sang dynamic theo level

