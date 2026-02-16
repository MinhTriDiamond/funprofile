
# Toi uu hoa giao dien dien thoai cho video nen Tet va nhac nen

## Muc tieu
Dam bao video nen Tet va nut nhac hien thi muot ma tren giao dien dien thoai, bao gom ca trang dang nhap va sau khi dang nhap.

## Cac van de hien tai va giai phap

### 1. Video nen Tet - Toi uu hieu suat tren mobile
**File**: `src/components/ui/TetBackground.tsx`
- Them thuoc tinh `fetchpriority="low"` de video khong canh tranh tai nguyen voi noi dung chinh
- Them CSS `will-change: transform` de GPU xu ly video muot hon tren mobile
- Giam `saturate` va `contrast` filter nhe hon de giam tai GPU tren thiet bi yeu

### 2. Nut nhac noi (Floating Music Button) - Vi tri chong cheo
**File**: `src/App.tsx`
- Hien tai nut nhac noi dat tai `bottom-24 right-4` co the bi che boi cac thanh phan khac hoac nam qua cao
- Di chuyen vi tri len `bottom-36` de tranh bi che boi bottom nav va cac thanh phan khac
- Them `backdrop-blur` nhe de nut noi bat hon tren nen video

### 3. Flower Overlay - Toi uu GPU rendering
**File**: `src/components/ui/TetFlowerOverlay.tsx`  
- Them `will-change: opacity` va `transform: translateZ(0)` de GPU xu ly glow effects muot hon
- Giam `opacity` tu 0.7 xuong 0.5 de giam tai rendering

### 4. Mobile CSS - Toi uu cuon trang
**File**: `src/index.css`
- Them `-webkit-backface-visibility: hidden` cho video background de chong flickering tren iOS
- Dam bao `contain: strict` cho video container de khong anh huong den layout cua noi dung chinh

### 5. Bottom Nav transparency - Dong bo voi nen Tet
**File**: `src/components/layout/MobileBottomNav.tsx`
- Thay doi `bg-white/90` thanh `bg-white/85` de video nen hien thi nhe qua bottom nav, tao su dong bo voi chu de Tet

## Chi tiet ky thuat

### TetBackground.tsx
- Them `fetchpriority="low"` cho the video
- Them `will-change: transform` vao style
- Them `-webkit-backface-visibility: hidden` de chong flickering iOS

### App.tsx  
- Sua vi tri floating music button tu `bottom-24` thanh `bottom-36` de khong bi che boi Angel AI button va bottom nav

### TetFlowerOverlay.tsx
- Them `will-change: opacity` vao style cua 2 glow elements
- Giam opacity tu 0.7 xuong 0.5

### MobileBottomNav.tsx
- Sua `bg-white/90` thanh `bg-white/85` de thay nhe video nen Tet qua thanh dieu huong

### index.css
- Them `-webkit-backface-visibility: hidden` vao `.tet-background-container`
- Them `contain: strict` cho video wrapper
