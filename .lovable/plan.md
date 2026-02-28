

# Hien thi Trend (Xu huong 7 ngay) tren bang Light Community

## Mo ta
Them hien thi trend emoji (Growing/Stable/Reflecting) ben canh moi thanh vien trong bang Light Community. Du lieu `trend` va `trend_emoji` da co san tu RPC `get_light_community`, chi can hien thi len giao dien.

## Thay doi

### 1. `src/pages/Leaderboard.tsx` - Trang danh sach day du
- Them trend emoji ngay sau badge Light Level trong moi dong thanh vien
- Hien thi `member.trend_emoji` kem tooltip/text nho cho `member.trend`
- Vi du: 📈 (Growing), 🔄 (Reflecting), 🌿 (Stable)

### 2. `src/components/feed/TopRanking.tsx` - Widget trang chu
- Tuong tu, them trend emoji ben canh badge Light Level
- Kich thuoc nho hon de phu hop voi widget compact

## Chi tiet ky thuat

Trong moi member card, them mot phan tu hien thi trend emoji ngay sau badge:

```tsx
{/* Light Level badge */}
<span className={`... ${getLevelStyle(member.light_level)}`}>
  {member.light_level}
</span>

{/* Trend emoji */}
<span className="text-sm shrink-0" title={member.trend}>
  {member.trend_emoji}
</span>
```

Khong can thay doi database hay RPC vi du lieu da co san.

