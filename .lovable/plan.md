
# Kế Hoạch: Hoàn Thiện Hệ Thống Thông Báo Bạn Bè & Giao Dịch

## Tổng Quan

Hoàn thiện hệ thống thông báo để tự động tạo notification trong database khi:
1. Có người gửi lời mời kết bạn → `friend_request`
2. Có người đồng ý lời mời kết bạn → `friend_accepted`  
3. Có người hủy kết bạn → `friend_removed` (loại mới)

## Hiện Trạng

| Thành phần | Trạng thái |
|------------|------------|
| DonationReceivedNotification | ✅ Hoạt động |
| UI hiển thị friend notifications | ✅ Có sẵn |
| Database triggers cho friendships | ❌ Chưa có |
| Notification type `friend_removed` | ❌ Chưa có |

## Chi Tiết Kỹ Thuật

### 1. Database Migration

Tạo migration SQL để:

**a) Tạo trigger khi INSERT vào friendships (gửi lời mời)**
```sql
CREATE OR REPLACE FUNCTION create_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi có lời mời kết bạn mới (status = pending)
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (NEW.friend_id, NEW.user_id, 'friend_request');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_request_notification();
```

**b) Tạo trigger khi UPDATE friendships (đồng ý kết bạn)**
```sql
CREATE OR REPLACE FUNCTION create_friend_accepted_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi status chuyển từ pending sang accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (NEW.user_id, NEW.friend_id, 'friend_accepted');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_accepted_notification();
```

**c) Tạo trigger khi DELETE friendships (hủy kết bạn)**
```sql
CREATE OR REPLACE FUNCTION create_friend_removed_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ thông báo khi hủy kết bạn đã được chấp nhận
  IF OLD.status = 'accepted' THEN
    -- Thông báo cho cả hai phía
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (OLD.friend_id, OLD.user_id, 'friend_removed');
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_removed
  AFTER DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_removed_notification();
```

### 2. Cập Nhật Frontend

**a) File: `src/components/layout/notifications/types.ts`**
- Thêm `friend_removed` vào FRIEND_REQUEST_TYPES

**b) File: `src/components/layout/notifications/utils.ts`**
- Thêm icon cho `friend_removed` (UserX màu đỏ)
- Thêm text: "đã hủy kết bạn với bạn"

### 3. Sơ Đồ Luồng Thông Báo

```text
┌─────────────────────────────────────────────────────────────┐
│                    FRIENDSHIP TRIGGERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [User A gửi lời mời]                                        │
│         │                                                    │
│         ▼                                                    │
│  INSERT friendships (status=pending)                         │
│         │                                                    │
│         ▼ Trigger                                            │
│  ┌─────────────────────────────────────┐                    │
│  │ notifications INSERT                 │                    │
│  │ user_id: B (người nhận lời mời)     │                    │
│  │ actor_id: A (người gửi)             │                    │
│  │ type: 'friend_request'              │                    │
│  └─────────────────────────────────────┘                    │
│         │                                                    │
│         ▼ Realtime                                           │
│  User B nhận được thông báo chuông                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [User B chấp nhận]                                          │
│         │                                                    │
│         ▼                                                    │
│  UPDATE friendships SET status='accepted'                    │
│         │                                                    │
│         ▼ Trigger                                            │
│  ┌─────────────────────────────────────┐                    │
│  │ notifications INSERT                 │                    │
│  │ user_id: A (người gửi lời mời ban đầu) │                │
│  │ actor_id: B (người chấp nhận)        │                   │
│  │ type: 'friend_accepted'              │                   │
│  └─────────────────────────────────────┘                    │
│         │                                                    │
│         ▼ Realtime                                           │
│  User A nhận được thông báo "B đã chấp nhận kết bạn"         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [User A hủy kết bạn]                                        │
│         │                                                    │
│         ▼                                                    │
│  DELETE FROM friendships                                     │
│         │                                                    │
│         ▼ Trigger                                            │
│  ┌─────────────────────────────────────┐                    │
│  │ notifications INSERT                 │                    │
│  │ user_id: B (người bị hủy)           │                    │
│  │ actor_id: A (người hủy)             │                    │
│  │ type: 'friend_removed'              │                    │
│  └─────────────────────────────────────┘                    │
│         │                                                    │
│         ▼ Realtime                                           │
│  User B nhận được thông báo "A đã hủy kết bạn"               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tổng Kết Files

| File | Hành động |
|------|-----------|
| `supabase/migrations/[new].sql` | Tạo 3 triggers cho friendships |
| `src/components/layout/notifications/types.ts` | Thêm `friend_removed` type |
| `src/components/layout/notifications/utils.ts` | Thêm icon + text cho `friend_removed` |

## Kết Quả Mong Đợi

- ✅ Khi gửi lời mời kết bạn → Người nhận thấy thông báo realtime
- ✅ Khi đồng ý kết bạn → Người gửi lời mời thấy thông báo realtime
- ✅ Khi hủy kết bạn → Người bị hủy thấy thông báo realtime
- ✅ Thông báo nhận tiền giữ nguyên hoạt động bình thường
