
# Chuyen doi "TOP RANKING" thanh "Light Community" theo tinh than PPLP

## Tong Quan
Thay doi bang "TOP RANKING" (hien thi xep hang canh tranh voi so thu diem) thanh "Light Community" — hien thi Light Level cua tung nguoi dung theo tinh than PPLP: khong canh tranh, khong nuoi Ego, chi the hien cap do anh sang va xu huong tang truong.

## Thay doi chinh

### 1. Tao RPC moi: `get_light_community`
Tao mot database function moi de truy van light level cua cac thanh vien cong dong:

- Truy van bang `light_actions` de tinh `total_light_score` cho moi user
- Join voi `profiles` de lay username, avatar
- Xac dinh Light Level dua tren diem:
  - 0-20: Light Seed
  - 21-40: Light Sprout
  - 41-60: Light Builder
  - 61-80: Light Guardian
  - 81+: Light Architect
- Xac dinh xu huong (trend) dua tren hoat dong gan day
- Sap xep theo `total_light_score` giam dan, gioi han 10 user
- Loc bo user bi banned (`is_banned = false`)
- **Khong tra ve diem so cu the** — chi tra level name va trend

**Schema tra ve:**
```text
user_id, username, avatar_url, light_level, light_emoji, trend, trend_emoji
```

### 2. Chuyen doi component `TopRanking.tsx` thanh `LightCommunity.tsx`

**Thay doi giao dien:**
- Tieu de: "TOP RANKING" -> "LIGHT COMMUNITY"
- Bo so thu tu canh tranh (#1, #2, #3...)
- Moi user hien thi:
  - Avatar + Username (giu nguyen)
  - Light Level badge (vd: "Light Builder") thay vi diem so
  - Trend indicator (Growing / Stable / Reflecting) thay vi total_reward
- Bo mau vang canh tranh (#FFD700 cho rank), thay bang mau xanh la nhe (green tones) phu hop tinh than anh sang
- Nut "Xem bang xep hang day du" -> "Kham pha cong dong anh sang"

**Khong hien thi:**
- So thu tu xep hang
- Diem so cu the
- Bat ky yeu to canh tranh nao

### 3. Cap nhat `FacebookRightSidebar.tsx`
- Import `LightCommunity` thay vi `TopRanking`

### 4. Cap nhat Leaderboard link
- Nut "Kham pha cong dong anh sang" van tro den `/leaderboard` (giu nguyen trang leaderboard hien tai, co the chuyen doi sau)

## Chi tiet ky thuat

### Database Migration
```text
CREATE FUNCTION get_light_community(p_limit int DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  light_level text,
  light_emoji text,
  trend text,
  trend_emoji text
)
```

Logic:
- Tinh SUM(light_score) tu light_actions GROUP BY user_id
- Map score range -> level name + emoji
- Tinh trend bang so sanh light_score 7 ngay gan nhat voi 7 ngay truoc do:
  - Tang > 10%: "Growing" 
  - Giam > 10%: "Reflecting"
  - Con lai: "Stable"
- Filter: profiles.is_banned = false
- ORDER BY total_light_score DESC, LIMIT p_limit

### Component thay doi
- Rename file: `TopRanking.tsx` -> noi dung moi trong cung file (giu ten file de tranh anh huong import khac)
- Thay doi interface `LeaderboardUser` thanh `LightCommunityMember`
- Thay doi fetch tu `get_user_rewards_v2` sang `get_light_community`
- UserRow: bo rank number, them Light Level badge va Trend indicator

### Cac file can chinh sua
1. **Database migration** — tao RPC `get_light_community`
2. **`src/components/feed/TopRanking.tsx`** — chuyen doi thanh Light Community UI
3. **`src/components/feed/FacebookRightSidebar.tsx`** — cap nhat comment/import neu can
