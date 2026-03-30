

## Sửa lỗi: chuyển tab khiến fun.rich load lại về trang chủ

### Nguyên nhân

Trong `UpdateNotification.tsx`, dòng 12-16:
```tsx
useEffect(() => {
  if (updateAvailable) {
    applyUpdate(); // = window.location.reload()
  }
}, [location.pathname, updateAvailable, applyUpdate]);
```

Khi `updateAvailable = true` (có thể do false positive từ dev/preview environment), bất kỳ thay đổi route nào cũng **tự động reload trang**, khiến user bị đẩy về trang chủ. Ngoài ra, `useVersionCheck` fetch `/index.html` mỗi 5 phút — trong môi trường Lovable preview, hash có thể thay đổi dù không có bản publish thực sự.

### Thay đổi

**File `src/components/UpdateNotification.tsx`**
- **Xóa** logic auto-reload khi route change (xóa useEffect dòng 12-16)
- **Chỉ giữ** toast thông báo với nút "Cập nhật" để user tự quyết định reload
- Như vậy khi có bản cập nhật mới, user sẽ thấy toast và nhấn nút khi sẵn sàng — không bị reload đột ngột

### Không thay đổi
- `useVersionCheck.ts` — logic polling vẫn giữ nguyên
- `AuthSessionKeeper` — không liên quan

