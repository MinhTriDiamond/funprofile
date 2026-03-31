

## Chỉnh ngưỡng phát hiện nội dung lặp — chỉ cảnh báo khi 100% giống nhau

### Vấn đề
Hiện tại hệ thống dùng **60% word overlap** để phát hiện bài lặp → các bài tặng tiền (có cấu trúc tương tự nhưng nội dung khác nhau) bị cảnh báo sai.

User muốn: **chỉ nhắc nhở khi bài viết y chang 100%**.

### Phân tích
- Hệ thống đã có **exact duplicate detection** bằng content hash (SHA-256) ở dòng 342-369 — đây chính là kiểm tra 100% giống nhau.
- Phần **repetitive content detection** (60% word overlap, dòng 381-404) đang gây false positive cho bài tặng tiền.

### Thay đổi

**File: `supabase/functions/create-post/index.ts`**

1. **Nâng ngưỡng overlap từ `0.6` lên `0.95`** (dòng 98) — chỉ coi là lặp khi gần như y chang (95%+), cho phép các bài tặng tiền có cấu trúc giống nhưng tên/số khác nhau không bị ảnh hưởng.

2. **Nâng ngưỡng block từ `3` lên `5`** (dòng 101) — khó bị block hơn, chỉ block khi thật sự spam rõ ràng.

### Kết quả
- Bài tặng tiền với nội dung khác nhau (tên người, số tiền khác) sẽ **không bị cảnh báo**.
- Chỉ bài viết **gần như y chang 100%** mới bị nhắc nhở.
- Exact duplicate (100% giống nhau qua hash) vẫn hoạt động bình thường.

