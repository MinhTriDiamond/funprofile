

# Sửa lỗi giao diện bị kẹt khi đăng bài có video lớn

## Nguyên nhân

Khi upload video 265MB (59 phút), quá trình upload kéo dài nhiều phút. Trong thời gian đó, **phiên đăng nhập (auth token) có thể hết hạn**. Khi nhấn "Đăng":

1. `getSession()` bị treo hoặc trả về token hết hạn -- code có timeout 15 giây (OK)
2. Fallback gọi `refreshSession()` -- **KHÔNG CÓ timeout** --> treo vô thời hạn
3. Watchdog 90 giây có thể không kịp xử lý nếu `refreshSession()` treo ở tầng network

Ngoài ra, sau khi upload video lớn xong, token đã cũ nhưng code không **chủ động refresh** trước khi submit.

## Giải pháp

### File: `src/components/feed/FacebookCreatePost.tsx`

1. **Thêm timeout cho `refreshSession()`**: Bọc mỗi lần gọi `refreshSession()` trong `Promise.race` với timeout 10 giây, giống `getSession()`.

2. **Chủ động refresh token khi video upload xong**: Trong callback `onUploadComplete` của `VideoUploaderUppy`, gọi `supabase.auth.refreshSession()` ngay để đảm bảo token mới nhất sẵn sàng khi người dùng nhấn "Đăng".

3. **Giảm watchdog timeout**: 90 giây quá lâu cho bước submit (không upload). Giảm xuống **45 giây** để người dùng không phải chờ quá lâu khi có lỗi.

### Chi tiết kỹ thuật

**Thay doi 1 - Timeout cho refreshSession (dòng 361 va 371):**

```typescript
// Hiện tại (KHÔNG có timeout):
const { data: refreshData } = await supabase.auth.refreshSession();

// Sửa thành (CÓ timeout 10 giây):
const { data: refreshData } = await Promise.race([
  supabase.auth.refreshSession(),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('refreshSession timeout (10s)')), 10000)
  )
]);
```

**Thay đổi 2 - Refresh token khi video upload xong (dòng 791-795):**

```typescript
onUploadComplete={(result) => {
  setUppyVideoResult(result);
  setIsVideoUploading(false);
  setPendingVideoFile(null);
  // Chủ động refresh token sau khi upload video lâu
  supabase.auth.refreshSession().catch(err =>
    console.warn('[CreatePost] Token refresh after video upload failed:', err)
  );
}}
```

**Thay đổi 3 - Giảm watchdog (dòng 329):**

```typescript
// 90000 -> 45000
const watchdogTimeout = setTimeout(() => {
  console.error('[CreatePost] Watchdog timeout triggered (45s)');
  // ...
}, 45000);
```

### Kết quả mong đợi

- Sau khi video upload xong, token được refresh ngay --> nhấn "Đăng" sẽ có token mới
- Nếu `getSession()` hoặc `refreshSession()` bị treo, timeout sẽ bắt lỗi trong tối đa 25 giây (15s + 10s)
- Watchdog 45 giây đảm bảo UI không bao giờ treo quá lâu
- Thông báo lỗi rõ ràng thay vì treo vô hạn

