

# Fix UI Desktop: Tăng Độ Rộng Dialog

## Vấn Đề

Dialog `UnifiedGiftSendDialog` đang dùng `max-w-md` (448px) cho mọi breakpoint, gây tràn ngang trên desktop.

## Thay Đổi

### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

Dòng 469 — thay className của `DialogContent`:

**Trước:**
```
max-w-md max-h-[90vh] overflow-y-auto
```

**Sau:**
```
w-[95vw] max-w-md lg:max-w-[720px] max-h-[90vh] overflow-y-auto overflow-x-hidden
```

Chi tiết:
- Mobile/Tablet: giữ `max-w-md` (448px) nhu cu
- Desktop (>= 1024px): mo rong len `max-w-[720px]`
- Them `overflow-x-hidden` de ngan cuon ngang
- Them `w-[95vw]` de mobile luon vua man hinh

Dong 471-473 — title: them `break-words` de title dai co the xuong dong thay vi tran:

**Truoc:**
```tsx
<span className="truncate">{dialogTitle}</span>
```

**Sau:**
```tsx
<span className="break-words">{dialogTitle}</span>
```

Chi co 1 file can sua, thay doi nho (2 dong).

