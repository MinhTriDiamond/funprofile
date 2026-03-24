

## Thông báo điều chỉnh CAMLY — cập nhật lời nhắn yêu thương

### Thay đổi so với plan trước

Chỉ cập nhật nội dung message trong metadata, thêm lời chúc Fun.rich. Toàn bộ kế hoạch kỹ thuật giữ nguyên.

### Message mới

```
💛 Xin chào bạn yêu thương! Angel AI đã vô tình tính nhầm lệnh tặng quà (gift) là bài viết và tặng CAMLY cho những bài đó. Hệ thống đã điều chỉnh lại số dư chính xác. Xin lỗi bạn vì sự nhầm lẫn này — chúng mình yêu thương bạn thật nhiều! 💖 Chúc bạn luôn vui vẻ, giàu có và hạnh phúc cùng Fun.rich 🌞💎✨
```

### Files thay đổi

1. **`supabase/migrations/...new.sql`** — INSERT notifications với message mới
2. **`src/components/layout/notifications/types.ts`** — thêm `amount`, `message`, `gift_count` vào `NotificationMetadata`
3. **`src/components/layout/notifications/utils.ts`** — thêm icon + text cho type `reward_adjustment`
4. **`src/hooks/useNotifications.ts`** — thêm routing `reward_adjustment` → `/wallet`

### Chi tiết kỹ thuật

- Migration INSERT notification cho mỗi user có gift posts, actor = `funtreasury`
- Frontend: icon Wallet orange, hiển thị `metadata.message`, click → `/wallet`
- Type `reward_adjustment` tái sử dụng được cho các điều chỉnh tương lai

