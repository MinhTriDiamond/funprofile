

# Fix lỗi đăng bài: "supabase.auth.getClaims is not a function"

## Nguyên nhân

Edge function `create-post` sử dụng `supabase.auth.getClaims(token)` -- nhưng method này **không tồn tại** trong phiên bản Supabase JS client `@2.49.1` đang dùng. Đây là lý do bài viết không thể đăng được.

## Giải pháp

Thay `getClaims(token)` bằng `getUser(token)` -- giống cách các edge function khác đang hoạt động tốt (ví dụ `record-donation`).

## Thay đổi cần thực hiện

### `supabase/functions/create-post/index.ts`

Thay đoạn xác thực user (dòng 71-83):

**Trước:**
```typescript
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub as string;
```

**Sau:**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) { ... }
const userId = user.id;
```

Chỉ sửa 1 file, thay 3 dòng. Toàn bộ logic tạo bài viết, duplicate detection, media, tags giữ nguyên.

## Kết quả mong đợi
- Đăng bài với text, ảnh, video hoạt động bình thường trở lại
- Không còn lỗi "getClaims is not a function"

