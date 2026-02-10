
# Fix: Nen Den Mo (Dark Overlay) Tren Mobile

## Nguyen Nhan Goc

Loi khong phai do modal/dialog bi ket. Nguyen nhan that la su ket hop cua:

1. **`<video>` letterboxing**: `TetBackground` dung `object-fit: contain` tren mobile portrait. Khi video ngang (landscape) hien thi tren man hinh doc (portrait) cao, phan khong co noi dung video se hien mau **den** (mac dinh cua the `<video>` tren iOS Safari/Chrome).

2. **Khong co nen cho content area**: Cac trang nhu Chat, Feed co `main` container khong set `background`. Vi `body` la `transparent` (de video Tet hien qua), nen khu vuc khong co noi dung se trong suot va lo ra phan den cua video phia sau.

3. **Ket qua**: Nua duoi man hinh (noi khong co conversation items) trong suot -> thay den tu video -> trong nhu overlay bi ket.

## Giai Phap (3 thay doi)

### 1. `src/components/ui/TetBackground.tsx` -- Them background cho video element

Them `backgroundColor` matching theme background cho the `<video>` de khong con letterbox den:

```tsx
<video
  ...
  style={{
    WebkitTransform: 'translateZ(0)',
    transform: 'translateZ(0)',
    backgroundColor: 'hsl(45 30% 97%)',  // match --background
  }}
>
```

Ngoai ra, set video container gradient thanh `to-background/95` de dam bao khong co khe ho.

### 2. `src/pages/Chat.tsx` -- Them bg-background cho mobile layout

Them `bg-background/95` (ban trong suot nhe de van thay hoa mai o goc) cho `main` va outer container:

```tsx
// Mobile layout
<div className="min-h-screen overflow-hidden bg-background/80">
  ...
  <main className="fixed inset-x-0 top-[3cm] bottom-[72px] flex flex-col overflow-hidden bg-background/90">
```

### 3. `src/index.css` -- Dam bao tet-video khong letterbox den

Them rule CSS cho video:

```css
.tet-video {
  background-color: hsl(45 30% 97%); /* prevent black letterbox */
}
```

## Tong Ket Files

| File | Hanh dong | Mo ta |
|------|-----------|-------|
| `TetBackground.tsx` | Sua nho | Them `backgroundColor` cho video element |
| `Chat.tsx` | Sua nho | Them `bg-background/90` cho main container mobile |
| `index.css` | Sua nho | Them `background-color` cho `.tet-video` |

## Ket Qua Mong Doi

- Khong con nen den mo o nua duoi man hinh tren mobile
- Video Tet van hien thi binh thuong (hoa mai/dao o goc)
- Noi dung chat/feed co nen sang, de doc
- Khong anh huong den Dialog/Sheet/Drawer khi mo/dong
