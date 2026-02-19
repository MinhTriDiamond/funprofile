

## Chỉnh sửa dialog "Tài khoản không khớp" cho đẹp hơn

### Vấn đề
Từ ảnh chụp, dialog bị tràn chữ sang phải do các nút và nội dung bên trong vượt quá chiều rộng `max-w-sm` của dialog.

### Thay đổi

**File: `src/components/wallet/AccountMismatchModal.tsx`**

1. Tăng `max-w-sm` lên `max-w-md` cho DialogContent để có thêm không gian
2. Thêm `overflow-hidden` và `break-all` cho phần hiển thị address để không tràn
3. Thêm `whitespace-nowrap` + `truncate` cho text trong nút để chữ không bị xuống dòng hoặc tràn
4. Đảm bảo các nút có `overflow-hidden` để nội dung không vượt ra ngoài

### Chi tiết kỹ thuật

```tsx
// DialogContent: tăng width
<DialogContent className="max-w-md">

// Address display: thêm truncate
<span className="font-mono font-medium truncate max-w-[140px] text-right">{shortProvider}</span>

// Buttons: thêm truncate cho text
<Button className="w-full ... overflow-hidden">
  <ArrowRightLeft className="w-4 h-4 mr-2 flex-shrink-0" />
  <span className="truncate">Dùng tài khoản trong ví ({shortProvider})</span>
</Button>
```

