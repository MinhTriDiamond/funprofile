

## Chẩn đoán lỗi

**Nguyên nhân gốc**: Trong edge function `fetch-link-preview/index.ts`, dòng 518-519:

```typescript
const INTERNAL_DOMAINS = ['fun.rich', 'funprofile.lovable.app'];
const isInternalLink = INTERNAL_DOMAINS.some(d => normalizedUrl.includes(d));
```

Khi URL là `play.fun.rich/angelthuytram`, phép kiểm tra `normalizedUrl.includes('fun.rich')` trả về **true** vì `play.fun.rich` chứa chuỗi `fun.rich`. Hệ thống nhầm tưởng đây là link nội bộ → tra cứu username `angelthuytram` trong bảng `profiles` của Fun Profile → lấy avatar của user **cùng tên trên Fun Profile**, không phải user thật trên Fun Play.

Tương tự, `farm.fun.rich` và `planet.fun.rich` cũng bị ảnh hưởng.

## Kế hoạch sửa

### Bước 1: Sửa logic nhận diện domain nội bộ trong `fetch-link-preview`

Thay kiểm tra `includes()` bằng kiểm tra **hostname chính xác** — chỉ `fun.rich` và `funprofile.lovable.app` mới được coi là nội bộ. Các subdomain như `play.fun.rich`, `farm.fun.rich` sẽ fallback sang scrape OG image từ trang đích.

```typescript
// Trước (SAI):
const isInternalLink = INTERNAL_DOMAINS.some(d => normalizedUrl.includes(d));

// Sau (ĐÚNG):
try {
  const parsedUrl = new URL(normalizedUrl);
  const isInternalLink = INTERNAL_DOMAINS.includes(parsedUrl.hostname);
} catch { isInternalLink = false; }
```

### Bước 2: Xóa avatar sai đã lưu trong database

Chạy SQL query tìm tất cả profiles có `social_links` chứa platform `funplay` (hoặc `angel` trỏ đến subdomain) với `avatarUrl` sai, và xóa trường `avatarUrl` đó để hệ thống tự fetch lại đúng từ OG image.

### Bước 3: Deploy lại edge function

Sau khi sửa code, deploy `fetch-link-preview` để logic mới có hiệu lực ngay.

---

### Chi tiết kỹ thuật

**File cần sửa**: `supabase/functions/fetch-link-preview/index.ts`
- Dòng 518-519: Thay `includes()` bằng so sánh hostname chính xác
- Đảm bảo các URL `play.fun.rich`, `farm.fun.rich`, `planet.fun.rich` đều fallback sang `scrapeOgImage()`

**Database cleanup**: Xóa `avatarUrl` sai trong `social_links` JSON cho các link funplay/angel trỏ đến subdomain Fun ecosystem.

