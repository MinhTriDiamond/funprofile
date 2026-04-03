

# Thêm badge "Ví ngoài" vào GiftCelebrationCard (bài viết tặng quà trên feed)

## Vấn đề
Khi ví ngoài gửi BTC vào Fun.Rich, bài viết gift celebration trên feed (Hình 4) không hiển thị badge "Ví ngoài" như ở trang lịch sử (Hình 1, 2, 3), khiến người dùng không nhận biết được nguồn gốc giao dịch.

## Thay đổi

### File: `src/components/feed/GiftCelebrationCard.tsx`

Thêm badge "Ví ngoài" ngay dưới tên người gửi (dòng ~378-384), khi `isExternalGift === true`:

```tsx
// Sau dòng hiển thị tên sender (dòng 378), thêm badge:
{isExternalGift && (
  <span className="inline-block mt-0.5 bg-orange-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
    Ví ngoài
  </span>
)}
```

Badge sẽ có màu cam nổi bật trên nền xanh của card, nhất quán với style "Ví ngoài" ở các trang lịch sử.

