

## Bật lại nút Nhạc trên trang chủ + thêm bài hát mới

### Tổng quan
- Component `ValentineMusicButton` tồn tại nhưng không được dùng ở đâu, và hiện tại **không phát nhạc** (chỉ visual).
- Cần: bật lại nút nhạc trên navbar, thêm audio playback thật, và đưa bài hát mới vào danh sách chọn.

### Thay đổi

**1. Copy file nhạc vào `public/sounds/`**
- Copy `🎶_LIGHT_ECONOMY_ANTHEM_-_INFINITE_FLOW.mp3` → `public/sounds/light-economy-anthem.mp3`

**2. Sửa `ValentineMusicButton.tsx` — thêm audio playback thật**
- Thêm danh sách bài hát (bao gồm bài mới + các bài có sẵn: valentine, tet, rich-1/2/3)
- Bấm nút → phát/dừng nhạc thật qua `HTMLAudioElement`
- Volume slider điều chỉnh âm lượng thật
- Thêm dropdown/popover chọn bài hát
- Bài mặc định: `light-economy-anthem`

**3. Đưa `ValentineMusicButton` vào `FacebookNavbar.tsx`**
- Desktop: thêm vào phần right section (cạnh notification, gift...)
- Mobile: hiện trong navbar hoặc bottom nav

### Danh sách bài hát
| ID | Tên hiển thị | File |
|---|---|---|
| light-economy-anthem | Light Economy Anthem | /sounds/light-economy-anthem.mp3 |
| valentine | Nhạc Valentine | /sounds/valentine.mp3 |
| tet | Nhạc Tết | /sounds/tet.mp3 |
| rich-1 | Rich Rich Rich (1) | /sounds/rich-1.mp3 |
| rich-2 | Rich Rich Rich (2) | /sounds/rich-2.mp3 |
| rich-3 | Rich Rich Rich (3) | /sounds/rich-3.mp3 |

