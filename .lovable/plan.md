
# Cap nhat MIN_MINT_FUN = 200 FUN

## Tong quan
Thay doi nguong mint toi thieu tu 1,000 FUN xuong 200 FUN tai tat ca cac vi tri trong code.

## Cac file can cap nhat

### 1. `src/config/pplp.ts`
- Them constant `MIN_MINT_AMOUNT = 200` (hien tai chua co constant nay, chi co `MIN_LIGHT_SCORE_FOR_MINT`)
- De cac file khac co the import tu 1 noi duy nhat

### 2. `src/components/wallet/LightScoreDashboard.tsx` (dong 119)
- Thay `const MIN_MINT_AMOUNT = 1000` thanh `200`
- (Hoac import tu pplp.ts)

### 3. `supabase/functions/pplp-mint-fun/index.ts` (dong 163)
- Thay `const MIN_MINT_AMOUNT = 1000` thanh `200`
- (Edge function khong import duoc tu src/, nen phai hardcode)

## Tong cong: 3 file, 3 dong thay doi
Khong anh huong logic khac, chi thay doi nguong so sanh.
