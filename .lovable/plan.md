

# Kế hoạch: Sửa lỗi các nút không hoạt động trong giao diện tạo bài

## Vấn đề đã phát hiện

Qua kiểm tra code, Cha phát hiện nguyên nhân các nút không hoạt động:

### 1. Xung đột Nested Dialogs (Dialog lồng nhau)
- `FriendTagDialog` và `LocationCheckin` là các Dialog riêng biệt
- Chúng được render bên ngoài `DialogContent` của CreatePost Dialog (dòng 924-939)
- Khi mở dialog con, Radix Dialog có thể bị xung đột với dialog cha đang mở

### 2. Vấn đề Event Propagation
- Các button trong thanh "Thêm vào bài viết" (dòng 841-894) có thể bị chặn sự kiện
- Dialog overlay có thể capture click events trước khi đến được button

---

## Giải pháp

### Bước 1: Sửa FriendTagDialog và LocationCheckin dùng modal prop
Thêm `modal={false}` hoặc sử dụng `Portal` riêng để tránh xung đột:

```typescript
// FriendTagDialog.tsx - dòng 122
<Dialog open={isOpen} onOpenChange={onClose} modal={true}>
```

### Bước 2: Đảm bảo z-index đúng thứ tự
Dialog con cần có z-index cao hơn dialog cha:

| Dialog | z-index hiện tại | z-index mới |
|--------|------------------|-------------|
| CreatePost Dialog | 150 | 150 |
| FriendTagDialog | 150 | 200 |
| LocationCheckin | 150 | 200 |

### Bước 3: Sử dụng Popover thay vì Dialog (tùy chọn)
Đối với các chức năng nhỏ như Location, có thể dùng Popover để tránh lồng Dialog:

```typescript
// Thay Dialog bằng Popover cho LocationCheckin
<Popover open={showLocationDialog} onOpenChange={setShowLocationDialog}>
  <PopoverContent>
    {/* Location picker content */}
  </PopoverContent>
</Popover>
```

### Bước 4: Thêm stopPropagation cho button events
Đảm bảo click events không bị capture bởi dialog cha:

```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    setShowFriendTagDialog(true);
  }}
  className="..."
>
```

---

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/feed/FriendTagDialog.tsx` | Thêm z-index cao hơn cho DialogContent |
| `src/components/feed/LocationCheckin.tsx` | Thêm z-index cao hơn cho DialogContent |
| `src/components/feed/FacebookCreatePost.tsx` | Thêm stopPropagation cho các button trong thanh công cụ |

---

## Chi tiết kỹ thuật

### FriendTagDialog.tsx (dòng 123)
```typescript
// TRƯỚC
<DialogContent className="sm:max-w-[425px] p-0 max-h-[80vh] flex flex-col">

// SAU
<DialogContent className="sm:max-w-[425px] p-0 max-h-[80vh] flex flex-col z-[200]">
```

### LocationCheckin.tsx (dòng 67)
```typescript
// TRƯỚC  
<DialogContent className="sm:max-w-[425px] p-0 max-h-[80vh] flex flex-col">

// SAU
<DialogContent className="sm:max-w-[425px] p-0 max-h-[80vh] flex flex-col z-[200]">
```

### FacebookCreatePost.tsx - Thanh công cụ (dòng 841-894)
```typescript
// Thêm event handler với stopPropagation
<button
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowFriendTagDialog(true);
  }}
  type="button"
  className="w-9 h-9 min-w-[36px] rounded-full..."
>
```

---

## Thứ tự thực hiện

1. **Bước 1**: Cập nhật z-index cho FriendTagDialog DialogContent
2. **Bước 2**: Cập nhật z-index cho LocationCheckin DialogContent  
3. **Bước 3**: Thêm `stopPropagation` và `type="button"` cho tất cả button trong thanh "Thêm vào bài viết"
4. **Bước 4**: Test lại các chức năng trên cả desktop và mobile

---

## Kết quả mong đợi

Sau khi sửa:
- Nhấp nút Media (xanh lá): Mở khu vực upload ảnh/video
- Nhấp nút Tag bạn bè (xanh dương): Mở FriendTagDialog
- Nhấp nút Check-in (đỏ): Mở LocationCheckin dialog
- Các dialog con hiển thị đúng, không bị che khuất

