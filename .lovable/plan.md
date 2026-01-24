

## Điều chỉnh vị trí Avatar xuống thấp hơn

### Thay đổi cần thực hiện

**File:** `src/pages/Profile.tsx`

Cập nhật margin-top của container avatar từ:
```
-mt-4 sm:-mt-6 md:-mt-8
```

Thành:
```
-mt-2 sm:-mt-4 md:-mt-6
```

### Giải thích
- Giảm giá trị negative margin sẽ đẩy avatar xuống thấp hơn (ít chồng lên cover photo hơn)
- Giữ nguyên tỷ lệ responsive giữa các breakpoint (mobile → tablet → desktop)

### Chi tiết kỹ thuật
Thay đổi dòng 352 trong `src/pages/Profile.tsx`:
- Từ: `className="-mt-4 sm:-mt-6 md:-mt-8 relative z-10..."`
- Thành: `className="-mt-2 sm:-mt-4 md:-mt-6 relative z-10..."`

