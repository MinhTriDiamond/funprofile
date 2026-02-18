
# Hệ thống Mạng Xã Hội trên Avatar Orbit

## Tổng quan thay đổi

Thay thế các ô orbit cố định (7 nền tảng hệ sinh thái) bằng hệ thống orbit **động** — hiển thị các link mạng xã hội mà user tự cập nhật, phân bổ phía dưới avatar, không chạm vùng kim cương ở đỉnh.

---

## Phần 1 — Database Migration

Thêm cột `social_links` kiểu `JSONB` vào bảng `profiles`:

```text
ALTER TABLE profiles
  ADD COLUMN social_links JSONB DEFAULT '[]'::jsonb;
```

Mỗi phần tử trong mảng có cấu trúc:
```text
{
  "platform": "facebook",
  "label": "Facebook",
  "url": "https://facebook.com/username",
  "color": "#1877F2",
  "favicon": "https://www.facebook.com/favicon.ico"
}
```

Không cần thêm RLS mới vì policy hiện tại đã cho phép user cập nhật hàng `profiles` của chính mình.

---

## Phần 2 — Cập nhật `AvatarOrbit.tsx`

**Xoá** mảng `ORBIT_SLOTS` cố định và logic cũ.

**Thêm** prop `socialLinks: SocialLink[]`.

**Logic phân bổ góc** — tránh vùng kim cương (đỉnh trên):
```text
Vùng kim cương: -30° → +30° (tức 330° → 30°)
Vùng orbit:     30°  → 330° (300° cung phía dưới)

n = 1  → 180° (thẳng xuống)
n = 2  → 150°, 210°
n = 3  → 120°, 180°, 240°
...
n > 1  → angle_i = 30 + (300 / (n-1)) × i
```

**Mỗi ô tròn nhỏ:**
- Hiển thị favicon/logo của platform
- Viền màu theo `color` của platform, có glow nhẹ cùng màu
- Hover → tooltip hiển thị URL đầy đủ
- Click → mở link trong tab mới

**Nếu `socialLinks` rỗng** → không hiển thị ô nào (chỉ còn viên kim cương ở đỉnh).

---

## Phần 3 — Cập nhật `Profile.tsx`

Truyền `socialLinks` vào `<AvatarOrbit>`:

```tsx
<AvatarOrbit socialLinks={profile?.social_links || []}>
  ...avatar...
</AvatarOrbit>
```

---

## Phần 4 — Cập nhật `EditProfile.tsx`

Thêm section **"Mạng xã hội"** trong form, phía trên nút Lưu hồ sơ.

**9 Platform được hỗ trợ** (theo đúng thứ tự yêu cầu):

| # | Platform | Màu viền |
|---|---|---|
| 1 | Angel AI (angel.fun.rich) | #7C3AED |
| 2 | Fun Play (play.fun.rich) | #22c55e |
| 3 | Facebook | #1877F2 |
| 4 | YouTube | #FF0000 |
| 5 | Twitter/X | #000000 |
| 6 | Telegram | #2AABEE |
| 7 | TikTok | #010101 |
| 8 | LinkedIn | #0077B5 |
| 9 | Zalo | #0068FF |

**UI Section:**
- Dropdown chọn platform (9 lựa chọn với icon màu tương ứng)
- Input nhập URL trang cá nhân
- Nút **"Thêm"** → thêm vào danh sách (tối đa 9)
- Danh sách các link đã thêm, mỗi hàng hiển thị: icon + tên platform + URL rút gọn + nút ❌ xoá
- Không cho phép thêm cùng một platform hai lần
- Tất cả được lưu vào DB khi nhấn **"Cập nhật hồ sơ"**

---

## Thứ tự thực hiện

1. Chạy migration SQL thêm cột `social_links`
2. Cập nhật `AvatarOrbit.tsx` — nhận prop, tính góc động, render orbit
3. Cập nhật `Profile.tsx` — truyền `social_links` vào component
4. Cập nhật `EditProfile.tsx` — thêm UI quản lý mạng xã hội
