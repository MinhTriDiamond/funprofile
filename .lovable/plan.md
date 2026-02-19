

## Hiển thị mặc định tất cả biểu tượng mạng xã hội cho mọi user

### Vấn đề hiện tại
- 525/567 user chưa thiết lập social_links, nên orbit trống (chỉ có avatar + kim cương)
- Chỉ 42 user đã thêm link mới có các hình tròn xoay quanh avatar

### Giải pháp
Khi user chưa có social_links (mảng rỗng `[]`), hệ thống sẽ tự động hiển thị tất cả 9 biểu tượng mạng xã hội mặc định (Angel, FunPlay, Facebook, YouTube, Twitter, Telegram, TikTok, LinkedIn, Zalo) với favicon/logo. Khi user đã thêm link, hiển thị avatar cá nhân của họ thay cho favicon mặc định.

### Chi tiết kỹ thuật

**File: `src/components/profile/AvatarOrbit.tsx`**

1. Thay đổi logic tính `allLinks`:
   - Hiện tại: `allLinks = localLinks.filter(l => isOwner || !!l.url)` -- chỉ hiển thị link có URL
   - Mới: Nếu `localLinks` rỗng (user chưa thiết lập), tạo danh sách mặc định từ `PLATFORM_ORDER` với tất cả 9 platform, mỗi cái có favicon mặc định nhưng không có URL
   - Nếu `localLinks` có dữ liệu, giữ nguyên logic hiện tại

2. Cụ thể thay đổi trong block `allLinks` (khoảng dòng 227-234):
   ```typescript
   // Nếu user chưa có link nào, hiển thị tất cả icon mặc định
   const defaultLinks: SocialLink[] = PLATFORM_ORDER.map(p => {
     const preset = PLATFORM_PRESETS[p];
     return { platform: p, label: preset.label, url: '', color: preset.color, favicon: preset.favicon };
   });
   
   const displayLinks = localLinks.length > 0 ? localLinks : defaultLinks;
   
   const allLinks = [
     ...displayLinks
       .filter(l => isOwner || true) // Luôn hiển thị tất cả cho mọi người
       .map(l => ({ ...l, isEmpty: !l.url })),
     // pending slot chỉ cho owner...
   ];
   ```

3. Đối với non-owner xem profile người khác:
   - Link có URL: nhấp vào sẽ mở link trong tab mới (giữ nguyên)
   - Link không có URL (mặc định): hiển thị favicon, nhấp vào không có hành động

**File: `src/pages/Profile.tsx`** -- Không cần thay đổi, vì dữ liệu `social_links` đã được truyền đúng.

### Kết quả mong đợi
- Mọi profile đều hiển thị 9 icon mạng xã hội xoay quanh avatar
- User đã thêm link: hiển thị avatar cá nhân + nhấp mở link
- User chưa thêm link: hiển thị favicon mặc định, chỉ mang tính trang trí
- Giao diện đồng nhất cho tất cả 567 user

