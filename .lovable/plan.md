

# Doi icon 🏛️ Light Architect thanh mau xanh la

## Van de
Emoji Unicode (🏛️) khong the doi mau bang CSS `color`. Can thay the bang icon vector (Lucide) de co the tu do doi mau.

## Giai phap
Thay emoji 🏛️ bang icon `Landmark` tu Lucide (hinh tuong tu ngoi nha co cot) voi mau xanh la (`text-emerald-600`), chi ap dung cho level "Light Architect". Cac level khac van giu emoji tu database.

## Thay doi trong 2 file

### `src/components/feed/TopRanking.tsx` va `src/pages/Leaderboard.tsx`
- Import icon `Landmark` tu `lucide-react`
- Trong phan render emoji, kiem tra neu `light_level === "Light Architect"` thi hien thi `<Landmark className="text-emerald-600" />` thay vi emoji
- Nen vang (`bg-amber-100 border border-amber-400`) van giu nguyen

## Ket qua
- Nen vong tron: vang hoang kim (giu nguyen)
- Icon ben trong: xanh la (Landmark icon) thay vi emoji den

