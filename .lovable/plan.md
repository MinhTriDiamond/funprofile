

# Fix Swap modal bị cắt trên mobile DApp browser

## Vấn đề
Screenshot cho thấy modal Swap vẫn bị cắt ngang, nút Swap bị che một phần, và có thanh cuộn ngang. Nguyên nhân: `max-h-[calc(79vh-env(safe-area-inset-bottom))]` vẫn không đủ cao trên DApp browser, và `max-w-md` trên `DialogContent` có thể gây overflow ngang.

## Sửa 2 file

### File 1: `src/components/wallet/WalletCenterContainer.tsx` (dòng 532)
- Thay `className="max-w-md"` bằng className riêng cho mobile: trên mobile dùng full-height bottom sheet (`max-h-[100dvh] h-[100dvh] overflow-x-hidden`), trên desktop giữ `sm:max-w-md sm:h-auto sm:max-h-[85vh]`.

```tsx
<DialogContent className="max-w-[100vw] h-[100dvh] max-h-[100dvh] overflow-x-hidden sm:max-w-md sm:h-auto sm:max-h-[85vh]">
```

### File 2: `src/components/ui/dialog.tsx` (dòng 41)
- Thay `max-h-[calc(79vh-env(safe-area-inset-bottom))]` thành `max-h-[100dvh] h-[100dvh]` cho mobile để dialog chiếm toàn bộ chiều cao viewport.
- Thêm `overflow-x-hidden` để loại bỏ thanh cuộn ngang.

Mobile classes mới:
```
inset-x-0 bottom-0 h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]
```

Desktop classes giữ nguyên (dòng 43) với `sm:h-auto` để reset.

## Kết quả
- Mobile: Dialog chiếm toàn bộ màn hình như bottom sheet, nội dung cuộn được, nút Swap luôn hiện ở đáy.
- Desktop: Giữ nguyên dialog centered với max-width và max-height hợp lý.
- Không còn thanh cuộn ngang.

