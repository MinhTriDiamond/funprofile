

# Bo nen va vong tron cua icon emoji

## Yeu cau
Bo nen (background) va vien tron (rounded-full border) cua tat ca cac icon emoji trong danh sach thanh vien. Chi hien thi icon/emoji truc tiep, khong co container bao quanh.

## Thay doi trong 2 file

### `src/pages/Leaderboard.tsx` va `src/components/feed/TopRanking.tsx`
- Xoa ham `getEmojiContainerStyle` (khong can nua)
- Sua div chua emoji: bo cac class `rounded-full`, `bg-muted`, `bg-amber-100`, `border` -- chi giu lai kich thuoc va canh giua
- Truoc: `<div className="w-10 h-10 rounded-full flex items-center justify-center ... bg-amber-100 border border-amber-400">`
- Sau: `<div className="w-10 h-10 flex items-center justify-center text-lg shrink-0">`
- Icon Landmark van giu mau xanh la (`text-emerald-600`)

## Ket qua
- Khong con nen vang hay nen xam
- Khong con vien tron bao quanh
- Chi hien thi icon/emoji truc tiep

