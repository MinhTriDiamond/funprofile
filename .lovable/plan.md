

# Nang cap giao dien Pre-Live Setup (Facebook-style)

## Hien trang

Khi nguoi dung bam "Live Video" tren Feed, ung dung chuyen thang den `/live/new` va tu dong bat camera + micro + tao phien LIVE ngay lap tuc. Khong co buoc chuan bi nao de nguoi dung kiem tra thiet bi hay them mo ta.

## Thay doi

Thay vi chuyen thang den trang host, se hien thi mot **man hinh chuan bi toan man hinh** (full-screen pre-live setup) giong Facebook Live, bao gom:

1. **Camera preview toan man hinh** -- hien thi video tu camera phia truoc lam background
2. **Thanh dieu khien ben phai** -- cac nut bat/tat micro, xoay camera (flip), bat/tat flash (neu ho tro)
3. **O nhap mo ta** -- "Nhan de them mo ta..." o phia duoi
4. **Nut "Phat truc tiep"** -- nut lon mau xanh o cuoi man hinh
5. **Nut quay lai** -- goc trai tren de huy va quay ve

## Chi tiet ky thuat

### Tao trang moi: `src/modules/live/pages/PreLivePage.tsx`

Trang toan man hinh voi:
- Goi `navigator.mediaDevices.getUserMedia({ video: true, audio: true })` de lay camera preview
- Hien thi video stream lam background (full-screen, object-cover)
- Sidebar ben phai gom cac icon button:
  - Mic on/off (toggle)
  - Xoay camera (flip giua front/back)
  - Van ban (Aa) -- focus vao o mo ta
- O input mo ta o phia duoi voi placeholder "Nhan de them mo ta..."
- Nut "Phat truc tiep" mau xanh chiem toan bo chieu rong
- Khi bam "Phat truc tiep":
  - Dung preview stream
  - Chuyen sang `/live/new` voi state `{ title, privacy }` de `LiveHostPage` su dung

### Cap nhat: `src/modules/live/pages/LiveHostPage.tsx`

- Doc `location.state?.title` va `location.state?.privacy` de truyen vao `createLiveSession()`
- Thay vi dung title rong, su dung title tu PreLivePage

### Cap nhat: `src/components/feed/FacebookCreatePost.tsx`

- Doi `handleLiveVideoClick` tu `navigate('/live/new')` thanh `navigate('/live/setup')`

### Cap nhat: `src/App.tsx`

- Them route `/live/setup` tro den `PreLivePage`

### Cap nhat: `src/modules/live/liveService.ts`

- `createLiveSession` da ho tro `title` va `privacy` tu `CreateLiveSessionInput`, khong can thay doi

## Cac file can thay doi

| File | Thay doi |
|------|---------|
| `src/modules/live/pages/PreLivePage.tsx` | TAO MOI -- man hinh setup toan man hinh voi camera preview, dieu khien mic/camera, o nhap mo ta |
| `src/App.tsx` | Them route `/live/setup` |
| `src/components/feed/FacebookCreatePost.tsx` | Doi navigate tu `/live/new` sang `/live/setup` |
| `src/modules/live/pages/LiveHostPage.tsx` | Doc title/privacy tu `location.state` |

