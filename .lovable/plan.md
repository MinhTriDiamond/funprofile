

# Fix: GIF & Sticker Picker bị che bởi `overflow-hidden`

## Nguyên nhân gốc

`CommentSection.tsx` dòng 216 có `overflow-hidden` trên container cha. Khi picker dùng `sm:absolute` positioning trên desktop, nó bị clip bởi `overflow-hidden` → user chỉ thấy backdrop xám mà không thấy picker.

Trên mobile, picker dùng `fixed` nên thoát được overflow, nhưng trên desktop (`sm:absolute`) thì bị ẩn hoàn toàn.

## Fix — 1 file: `CommentMediaUpload.tsx`

Bỏ `sm:absolute` positioning, luôn dùng `fixed` cho cả mobile và desktop. Đặt picker ở giữa màn hình (centered) thay vì cố gắng neo vào button.

**Dòng 117** (GIF picker container):
```
// Trước:
"fixed bottom-4 left-2 right-2 z-50 max-w-[calc(100vw-32px)] sm:absolute sm:bottom-full sm:left-auto sm:right-0 sm:mb-2 sm:w-80 sm:max-w-none"

// Sau:
"fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[calc(100vw-32px)]"
```

**Dòng 132** (Sticker picker container) — same fix.

Thay đổi này đảm bảo picker luôn hiển thị đúng trên cả web và mobile, không bị ảnh hưởng bởi `overflow-hidden` của cha.

