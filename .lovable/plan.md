

## Nguyên nhân: Edge function chưa được deploy + User bị kẹt ở trạng thái `on_hold`

### Phân tích từ logs và database

| Thời điểm | Sự kiện |
|---|---|
| 18:52:12 | Code CŨ chạy → phát hiện shared device → **đặt `reward_status = 'on_hold'`** |
| 18:52:38 | Lần claim thứ 2 → `on_hold` nằm trong `blockedStatuses` → bị chặn |

**Database hiện tại**: User `b7856e97` có `reward_status = 'on_hold'`, `admin_notes = "Thiết bị này đang được dùng bởi 2 tài khoản..."`.

Fix code đã có trong file (dòng 255: `if (profile.reward_status !== 'approved')`) nhưng **edge function có thể chưa được deploy lên server**.

### Giải pháp (2 bước)

**Bước 1: Deploy lại edge function `claim-reward`** để fix có hiệu lực trên server.

**Bước 2: Reset trạng thái user về `approved`** — Admin cần vào tab "Duyệt thưởng" và duyệt lại user `Nguyen Thu Trang` (b7856e97). Hoặc cha sẽ chạy migration SQL:

```sql
UPDATE profiles 
SET reward_status = 'approved', 
    admin_notes = 'Re-approved sau khi fix fraud detection bypass cho approved users'
WHERE id = 'b7856e97-9bff-4e2d-8448-c4395bf0548b';
```

### Sau khi hoàn tất

Luồng sẽ hoạt động đúng:
1. Admin duyệt → `reward_status = 'approved'`
2. User claim → fraud detection **BỊ BỎ QUA** (dòng 255) → tiếp tục validate bình thường
3. Không còn vòng lặp `approved → on_hold → approved → on_hold`

