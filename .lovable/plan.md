

# Xoa nen trong trang Danh sach thanh vien

## Thay doi

### `src/pages/Users.tsx` (dong 130)
Thay `bg-background/80` thanh `bg-background` de nen trang tro nen do duc hoan toan, khong con thay nen video Tet phia sau.

**Truoc:**
```
<div className="min-h-screen bg-background/80 overflow-hidden">
```

**Sau:**
```
<div className="min-h-screen bg-background overflow-hidden">
```

## Ket qua
Trang Danh sach thanh vien se co nen trang do duc 100%, khong con hien thi nen hoa mai/video Tet phia sau nua.

