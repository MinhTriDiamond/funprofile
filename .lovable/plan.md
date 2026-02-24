
# Tat nhac nen tren tat ca cac trang

## Muc tieu
Loai bo nut nhac Valentine va tat nhac tu dong tren tat ca cac trang.

## Cac file can chinh sua

### 1. `src/components/layout/ValentineMusicButton.tsx`
- Tat autoplay: dat `globalAutoplayDone = true` ngay tu dau de nhac khong tu dong phat
- Xoa toan bo logic autoplay trong useEffect

### 2. `src/App.tsx` (dong 119-122)
- Xoa nut nhac mobile floating:
```
<div className="fixed bottom-36 right-4 z-50 lg:hidden">
  <ValentineMusicButton variant="mobile" />
</div>
```

### 3. `src/components/layout/FacebookNavbar.tsx`
- Xoa tat ca `<ValentineMusicButton>` (dong 277, 312, 417) va import

### 4. `src/pages/Auth.tsx` (dong 97)
- Xoa `<ValentineMusicButton variant="desktop" />` va import

### 5. `src/pages/LawOfLight.tsx` (dong 154)
- Xoa `<ValentineMusicButton variant="desktop" />` va import

## Ket qua
- Khong con nhac tu dong phat khi vao trang
- Khong con nut nhac tren bat ky trang nao
