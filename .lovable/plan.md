
# Cải thiện xác thực khi tạo bài viết

## Nguyên nhân

Trong `FacebookCreatePost.tsx`, logic xác thực khi đăng bài có 2 bước nối tiếp:
1. `getSession()` timeout 15s
2. Nếu thất bại, `refreshSession()` timeout 10s

Khi mạng chậm hoặc tab bị suspend, cả 2 bước đều timeout, tổng cộng **25 giây** chờ rồi báo lỗi. Ngoài ra, `getSession()` chỉ đọc từ cache -- nếu cache trống thì timeout vô nghĩa.

## Giải pháp

### File: `src/components/feed/FacebookCreatePost.tsx` (dòng 346-386)

Thay thế logic xác thực hiện tại bằng cách tiếp cận đơn giản hơn:

1. Gọi `getSession()` trước (không cần timeout vì nó đọc từ memory cache, rất nhanh)
2. Nếu session tồn tại nhưng sắp hết hạn (dưới 5 phút), gọi `refreshSession()` với timeout 15s
3. Nếu không có session, gọi `refreshSession()` một lần với timeout 15s
4. Nếu vẫn thất bại, hiển thị thông báo rõ ràng yêu cầu đăng nhập lại

Thay doi cu the:

```typescript
// BEFORE (lines 346-386): 2 buoc timeout noi tiep = 25s
let session;
try {
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('getSession timeout (15s)')), 15000)
    )
  ]);
  session = sessionResult.data.session;
} catch (authError: any) {
  // fallback refreshSession with another timeout...
}

// AFTER: Don giản và mạnh hơn
let session;
const { data: sessionData } = await supabase.auth.getSession();
session = sessionData.session;

if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 300000)) {
  // Token sap het han hoac khong co -> refresh
  try {
    const { data: refreshData } = await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      )
    ]);
    if (refreshData.session) {
      session = refreshData.session;
    }
  } catch {
    // Refresh that bai, neu van con session cu thi dung tam
  }
}

if (!session) {
  throw new Error('Phien dang nhap het han. Vui long tai lai trang va dang nhap lai.');
}
```

Thay doi chinh:
- Bo `getSession()` timeout (vi no doc tu memory, khong can timeout)
- Chi goi `refreshSession()` khi can thiet (token sap het han hoac khong co session)
- Giam tu 2 buoc timeout (25s) xuong 1 buoc (15s)
- Thong bao loi ro rang hon cho nguoi dung

## Danh sach file

| File | Hanh dong | Mo ta |
|------|-----------|-------|
| `src/components/feed/FacebookCreatePost.tsx` | Sua | Cai thien logic xac thuc khi tao bai viet |
