

# Cập nhật giao diện thông báo nhận tiền — Chủ đề Tết 2026

## Tổng quan
Từ ngày 17/02/2026, khi người dùng nhận được tiền (donation), thẻ thông báo sẽ chuyển sang giao diện Tết:
- **Nền video Tết** `tet6-4.mp4` thay cho nền gradient xanh lá hiện tại
- **Nền trắng trong suốt** cho phần nội dung bên trong (thay vì nền xanh)
- **Dòng chữ "HAPPY NEW YEAR"** màu vàng kim hiển thị phía trên lời chúc mừng
- **Giảm số lượng chữ RICH** bay trên màn hình (từ 25 xuống còn 10)

## Các thay đổi cụ thể

### 1. Sao chép video nền Tết vào dự án
- Copy file `tet6-4.mp4` từ user-uploads vào `src/assets/tet6-4.mp4`

### 2. Sửa file `src/components/donations/DonationReceivedCard.tsx`
- Thêm logic kiểm tra ngày: nếu từ 17/02/2026 trở đi thì áp dụng giao diện Tết
- **Nền card**: Thay gradient xanh bằng video `tet6-4.mp4` chạy tự động, lặp lại, không tiếng
- **Nội dung bên trong**: Đổi nền các khối (amount, message) sang trắng trong suốt (`rgba(255,255,255,0.85)`) thay vì xanh lá
- **Thêm dòng chữ** `✨ HAPPY NEW YEAR ✨` màu vàng kim (#FFD700) với text-shadow rực rỡ, hiển thị phía trên lời chúc mừng hiện tại
- Viền card đổi sang vàng kim thay vì xanh lá

### 3. Sửa file `src/components/donations/RichTextOverlay.tsx`
- Giảm mảng `RICH_POSITIONS` từ 25 phần tử xuống còn **10 phần tử**
- Giữ nguyên hiệu ứng màu sắc và animation, chỉ giảm mật độ

## Chi tiết kỹ thuật

### Kiểm tra ngày Tết (trong DonationReceivedCard)
```typescript
const isTetSeason = new Date() >= new Date('2026-02-17T00:00:00');
```

### Cấu trúc nền video Tết
```typescript
{isTetSeason && (
  <video
    autoPlay loop muted playsInline
    className="absolute inset-0 w-full h-full object-cover"
    src={tetBackground}
  />
)}
```

### Nội dung bên trong — nền trắng trong suốt
- Khối amount: `background: rgba(255,255,255,0.85)`, chữ đổi sang màu tối
- Khối message: giữ `bg-white/80`
- Viền và shadow chuyển sang tông vàng kim

### Dòng HAPPY NEW YEAR
```typescript
{isTetSeason && (
  <h3 style={{
    color: '#FFD700',
    textShadow: '0 0 10px rgba(255,215,0,0.5), 0 0 20px rgba(255,215,0,0.3)',
  }}>
    ✨ HAPPY NEW YEAR ✨
  </h3>
)}
```

### Giảm RICH overlay (RichTextOverlay.tsx)
- Cắt `RICH_POSITIONS` từ 25 xuống 10 vị trí, giữ các vị trí phân bố đều trên màn hình

## Tóm tắt
- **3 thao tác**: Copy video + sửa 2 file
- Không thay đổi database
- Áp dụng tự động từ 17/02/2026 dựa trên ngày hệ thống
- Nếu trước ngày 17/02 thì giao diện vẫn giữ nguyên như cũ (xanh lá)

