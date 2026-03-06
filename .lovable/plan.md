

## Kế hoạch: Dọn dẹp hàng đợi duyệt thưởng & tăng cường kiểm soát điều kiện claim

### Phát hiện hiện tại

**6 user bị ban nhưng vẫn `reward_status = 'pending'`:**

| Username | ID |
|---|---|
| abdalmalika166v4w3m | 39f9ba22... |
| FU.Torykun | 7ce4b31a... |
| futorykun0274m425 | e90bc9ec... |
| jasminelasper902v3o4n | d4725b76... |
| van | be70b5f3... |
| wantai | f37e92da... |

**21 user active pending** — kiểm tra điều kiện claim:
- Chỉ **5 user** đáp ứng đủ điều kiện cơ bản (avatar + cover + fullname + ví + bài hôm nay): `binhtran568`, `loan01111956`, `mai60hd`, `thuongnguyen369`, `yenhanhphuc`
- **16 user còn lại** thiếu ít nhất 1 điều kiện (cover, ví, tên, hoặc chưa đăng bài hôm nay)

**Backend edge function `claim-reward`** đã kiểm tra đầy đủ tất cả điều kiện (avatar, cover, today_post, full_name ≥ 4 ký tự, ví, tuổi tài khoản ≥ 7 ngày). Nên dù admin duyệt nhầm, user vẫn không claim được nếu chưa đủ điều kiện.

### Thay đổi

#### 1. SQL Data Update — Đặt `reward_status = 'banned'` cho 6 user bị ban
Dùng công cụ insert/update (không phải migration):
```sql
UPDATE profiles 
SET reward_status = 'banned' 
WHERE is_banned = true AND reward_status = 'pending';
```

#### 2. SQL Migration — Tạo trigger tự động đồng bộ `reward_status` khi ban/unban
```sql
CREATE OR REPLACE FUNCTION sync_reward_status_on_ban()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_banned = true AND OLD.is_banned = false THEN
    NEW.reward_status := 'banned';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_reward_on_ban
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.is_banned IS DISTINCT FROM NEW.is_banned)
EXECUTE FUNCTION sync_reward_status_on_ban();
```

#### 3. Cập nhật Admin UI — Thêm badge điều kiện `cover` và `bài hôm nay` trong `RewardApprovalTab.tsx`

Hiện tại admin UI chỉ hiển thị 3 badge: Avatar, Tên, Ví. Cần thêm:
- **Badge "Bìa"**: kiểm tra `cover_url`
- **Badge "Bài hôm nay"**: kiểm tra `today_reward > 0` (proxy cho có hoạt động hôm nay)
- Cập nhật `isProfileComplete` và `isEligibleForApproval` để bao gồm `cover_url` và `today_reward > 0`
- Cập nhật `getMissingItems` tương ứng

**Cụ thể trong `RewardApprovalTab.tsx`:**

- Dòng 51-54: Thêm `!!user.cover_url` và `user.today_reward > 0` vào `isProfileComplete`
- Dòng 59-65: Thêm kiểm tra thiếu "Ảnh bìa" và "Bài đăng hôm nay" vào `getMissingItems`
- Dòng 490-494: Thêm 2 `ProfileBadge` mới cho Cover và Today Post
- Dòng 556-558: Thêm 2 điều kiện mới vào tooltip "Chưa đủ điều kiện"

Tổng: **1 file code sửa**, **1 data update SQL**, **1 migration SQL**.

