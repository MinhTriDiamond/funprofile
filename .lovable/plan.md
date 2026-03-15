

# Fix Honor Board che avatar + Dialog liên kết trên mobile

## Vấn đề
1. **Honor Board mobile** đặt `absolute` trong ảnh bìa → che mất avatar
2. **Dialog nhập link** chỉ rộng 220px, bị cắt trên mobile, khó dán link

## Giải pháp

### 1. `ProfileHeader.tsx` — Di chuyển Honor Board mobile ra ngoài ảnh bìa
- Xóa div Honor Board Mobile (absolute bên trong cover photo)
- Thêm Honor Board mobile **bên dưới ảnh bìa**, dùng component `MobileStats` (đã có sẵn layout 2 hàng × 4 ô)
- Chỉ hiển thị trên `md:hidden`

```text
Trước:
┌─────────────────────┐
│  Cover Photo        │
│         ┌──────┐    │  ← Honor Board che avatar
│         │ HB   │    │
│    👤   └──────┘    │
└─────────────────────┘

Sau:
┌─────────────────────┐
│  Cover Photo        │
│    👤               │
└─────────────────────┘
┌─────────────────────┐
│ [B.viết][C.xúc][B.luận][B.bè] │  ← 2 hàng × 4 ô
│ [Chia sẻ][Live][Rút][Đã rút]  │
│ [Hôm nay: xxx] [Tổng: xxx]    │
└─────────────────────┘
```

### 2. `AvatarOrbit.tsx` — Mở rộng dialog nhập link trên mobile
- Prompt popup & Edit popup: tăng width từ `220px` → `min(320px, 90vw)`
- Đổi vị trí: thay vì `bottom: 110%` (bị cắt phía trên), dùng logic responsive — trên mobile hiển thị bên dưới icon hoặc dùng fixed position
- Tăng kích thước input và text để dễ đọc, dễ dán link

### 3. `AvatarOrbit.tsx` — Picker "Chọn mạng xã hội" cũng mở rộng
- Tăng width picker từ `252px` → `min(320px, 90vw)` để hiển thị đủ chữ trên mobile

