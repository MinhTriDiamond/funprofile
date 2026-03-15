

# Chỉnh Gift History: Nút "Lịch sử" nằm ngang header, nhấp mở dropdown 30 ngày

## Ý tưởng

Thay vì hiển thị lịch 30 ngày luôn bên dưới header, sẽ đổi thành:
- **Nút "Lịch sử"** nằm cùng hàng với "Gift Celebration" trên header
- Nhấp vào → **mở dropdown/panel** hiển thị lưới 30 ngày, mỗi ngày kèm số lệnh giao dịch
- Nhấp vào ngày cụ thể → hiển thị toàn bộ gift của ngày đó bên dưới

```text
┌─────────────────────────────────────────────────┐
│ 🎁 Gift Celebration  🔊  [📅 Lịch sử T3]  20 gifts │
├─────────────────────────────────────────────────┤
│  (khi nhấp "Lịch sử" → dropdown mở ra)         │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐   │
│  │ 15  │ 14  │ 13  │ 12  │ 11  │ 10  │  9  │   │
│  │ 5🎁 │ 3🎁 │  0  │ 12🎁│  1🎁│  0  │  8🎁│   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤   │
│  │  8  │  7  │  6  │  5  │  4  │  3  │  2  │   │
│  │ ... │ ... │ ... │ ... │ ... │ ... │ ... │   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘   │
├─────────────────────────────────────────────────┤
│ [Gift cards cho ngày được chọn]                  │
└─────────────────────────────────────────────────┘
```

## Thay đổi

### 1. `GiftHistoryCalendar.tsx` — Đổi thành dropdown panel

- Thêm state `isOpen` để toggle hiển thị panel
- **Trigger**: Nút nhỏ hiển thị "📅 Lịch sử T{tháng}" nằm inline trong header (export riêng component trigger)
- **Panel**: Khi mở → hiển thị grid 7 cột × ~5 hàng (30 ngày), mỗi ô có số ngày + số lệnh giao dịch (`dateCounts[date]`)
- Nhấp vào ngày → gọi `onSelectDate` + đóng panel
- Ngày đang chọn highlight xanh, ngày hôm nay có border riêng

### 2. `GiftCelebrationGroup.tsx` — Di chuyển trigger lên header

- Bỏ `<GiftHistoryCalendar>` khỏi vị trí hiện tại (dưới header)
- Đặt trigger button của calendar **cùng hàng** với "Gift Celebration" title, giữa nút mute và badge count
- Calendar panel mở xuống bên dưới header khi nhấp

### 3. `useGiftHistory.ts` — Không thay đổi logic, giữ nguyên 30 ngày

### Files cần sửa
1. `src/components/feed/GiftHistoryCalendar.tsx` — refactor thành dropdown with grid
2. `src/components/feed/GiftCelebrationGroup.tsx` — đặt trigger trong header row

