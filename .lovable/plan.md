

# Chinh font chu va cai thien trang Light Community

## Thay doi 1: Font chu sang trong cho "Bang danh du" va "Cong dong anh sang"

Hien tai ca hai dang dung font `Orbitron/Rajdhani` — font ky thuat so, khong sang trong. Se doi sang font serif/sans-serif sang trong hon.

### Cac file can sua:
- **`src/components/feed/AppHonorBoard.tsx`** (dong 135): Doi fontFamily tu Orbitron sang font sang trong
- **`src/components/profile/CoverHonorBoard.tsx`** (dong 116): Tuong tu
- **`src/components/feed/TopRanking.tsx`** (dong 119): Doi fontFamily cho "LIGHT COMMUNITY" sidebar
- **`src/pages/Leaderboard.tsx`** (dong 93): Doi fontFamily cho "LIGHT COMMUNITY" trang chinh

Font moi se la: `'Playfair Display', 'Georgia', serif` — font sang trong, de doc, phu hop tinh than PPLP. Se them Google Font import vao `index.html`.

## Thay doi 2: Bo gioi han so luong user tren trang Leaderboard

- **`src/pages/Leaderboard.tsx`** (dong 51): Doi `p_limit: 100` thanh `p_limit: 1000` de hien thi toan bo danh sach user

## Thay doi 3: Chuyen Light Level badge sang cot ben phai (trang Leaderboard)

Hien tai layout da dung `justify-between` nen badge da nam ben phai roi (nhu screenshot cho thay). Tuy nhien trend indicator hien o duoi ten user — can chuyen no sang ben phai cung voi badge, hoac giu nguyen vi tri hien tai da dung (trend o duoi ten, badge ben phai).

Nhin lai screenshot user gui, layout hien tai da chinh xac: ten + trend ben trai, badge ben phai. Khong can thay doi layout — chi can dam bao no hoat dong nhat quan.

### Tom tat file can sua:
1. `index.html` — Them Google Font Playfair Display
2. `src/components/feed/AppHonorBoard.tsx` — Doi font
3. `src/components/profile/CoverHonorBoard.tsx` — Doi font
4. `src/components/feed/TopRanking.tsx` — Doi font
5. `src/pages/Leaderboard.tsx` — Doi font + bo gioi han p_limit

