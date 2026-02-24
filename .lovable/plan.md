

# Cập nhật logic IP Cluster: Chỉ đình chỉ khi đăng bài spam

## Vấn đề hiện tại
Hiện tại trong `daily-fraud-scan`, khi phát hiện >3 tài khoản cùng IP, hệ thống tự động đình chỉ (auto-hold) tất cả -- kể cả trường hợp các bé Love House dùng chung WiFi nhưng không spam bài. Điều này gây đình chỉ nhầm.

## Giải pháp mới

**Quy tắc:**
- Cùng IP, tối đa **5 tài khoản** -- nếu không spam bài viết liên tục thì **KHÔNG đình chỉ**, chỉ ghi nhận cảnh báo (severity thấp).
- Cùng IP + **đăng bài liên tục** (ví dụ: >5 bài/24h mỗi user hoặc tổng cụm >15 bài/24h) thì **đình chỉ + đưa vào theo dõi**.
- Cùng IP + cùng thiết bị (shared device) vẫn giữ logic cũ: đình chỉ ngay.

---

## Chi tiết kỹ thuật

### File: `supabase/functions/daily-fraud-scan/index.ts`

#### Thay đổi 1: Nâng ngưỡng IP cluster từ >3 lên >5
- Dòng 239: `if (users.size > 3)` -> `if (users.size > 5)`

#### Thay đổi 2: Thêm kiểm tra spam bài viết cho unique device users (dòng 307-332)
Thay vì auto-hold ngay khi cùng IP + khác thiết bị, thêm bước kiểm tra:

1. Query bảng `posts` để đếm số bài viết trong 24h của từng user trong cụm IP.
2. Nếu có user nào đăng **>5 bài/24h** HOẶC tổng bài viết của cả cụm **>15 bài/24h**: đình chỉ những user spam + ghi fraud signal `IP_SPAM_CLUSTER` severity 3.
3. Nếu không ai spam: chỉ ghi fraud signal `IP_CLUSTER` severity 1 (theo dõi), **KHÔNG auto-hold**.

```text
Logic mới cho unique device users cùng IP:
+-------------------------------+
| Cùng IP, >5 TK, khác device  |
+-------------------------------+
         |
    Kiểm tra posts 24h
         |
   +-----+------+
   |             |
 Spam (>5/user  Không spam
 hoặc >15 tổng)
   |             |
 Auto-hold    Chỉ cảnh báo
 + signal      severity 1
 severity 3    (không hold)
```

#### Thay đổi 3: Shared device vẫn giữ nguyên
- Cùng IP + cùng device: vẫn auto-hold như cũ (dòng 279-305 không đổi).

### Tổng kết
- **1 file sửa**: `supabase/functions/daily-fraud-scan/index.ts`
- Nâng ngưỡng IP từ 3 lên 5
- Thêm kiểm tra spam posts trước khi auto-hold
- Bảo vệ Love House khỏi bị đình chỉ nhầm khi dùng chung WiFi

