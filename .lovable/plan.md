

## Mục tiêu
Đổi nhãn hiển thị trong Honor Board và các dialog liên quan từ "Quà đã tặng / Quà đã nhận" thành **"Tổng tặng / Tổng nhận"** cho gọn và dễ hiểu.

## Thay đổi

File `src/i18n/translations.ts` — cập nhật các key tiếng Việt:

| Key | Cũ | Mới |
|---|---|---|
| `totalSent` | `'Quà đã tặng'` | `'Tổng tặng'` |
| `giftSentTotal` | `'Tổng Quà Đã Tặng'` | `'Tổng Tặng'` |
| `giftReceivedTotal` | `'Tổng Quà Đã Nhận'` | `'Tổng Nhận'` |
| `totalReceived` | `'Quà đã nhận'` | `'Tổng nhận'` |
| `totalSentLabel` | `'Tổng đã tặng'` | `'Tổng tặng'` |

Các ngôn ngữ khác (en, zh, ja, ko, th, id, fr, es, de, ru, ar) giữ nguyên — chỉ sửa tiếng Việt theo yêu cầu.

## Kết quả mong đợi
- Honor Board hiển thị: **"Tổng tặng"** và **"Tổng nhận"**
- Dialog chi tiết hiển thị: **"Tổng Tặng"** và **"Tổng Nhận"**
- Nhất quán với phong cách ngắn gọn, dễ đọc.

