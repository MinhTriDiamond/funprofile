

# Sửa Trang Đăng Nhập Chạy Mượt Mà

## Vấn Đề Phát Hiện

### 1. Nút đăng nhập bị kẹt "Đang khởi tạo..." (Critical)
- Khi gọi Edge Function `sso-otp-request`, không có timeout. Nếu function chậm (cold start 5-10s) hoặc lỗi mạng, nút loading kẹt vĩnh viễn.
- Tương tự với `sso-otp-verify` khi xác minh OTP.
- `ClassicEmailLogin` cũng có thể bị kẹt nếu Supabase Auth phản hồi chậm.

### 2. CoinGecko API spam liên tục (Performance)
- Hook `useTokenBalances` gọi CoinGecko API mỗi 30 giây, kể cả khi không có ví kết nối.
- Trong preview, tất cả requests đều thất bại ("Failed to fetch"), tạo hàng chục lỗi trong console.
- Gây lãng phí tài nguyên và có thể ảnh hưởng hiệu năng tổng thể.

## Kế Hoạch Sửa

### Bước 1: Thêm timeout cho các Edge Function calls trong `EmailOtpLogin`
**File**: `src/components/auth/EmailOtpLogin.tsx`

- Bọc `supabase.functions.invoke('sso-otp-request')` trong `Promise.race` với timeout 15 giây
- Bọc `supabase.functions.invoke('sso-otp-verify')` tương tự
- Khi timeout, hiển thị thông báo lỗi rõ ràng ("Kết nối chậm, vui lòng thử lại") và reset loading state

### Bước 2: Thêm timeout cho `ClassicEmailLogin`
**File**: `src/components/auth/ClassicEmailLogin.tsx`

- Bọc `supabase.auth.signInWithPassword` và `supabase.auth.signUp` trong timeout 15 giây
- Reset loading khi timeout

### Bước 3: Sửa CoinGecko fetch spam trong `useTokenBalances`
**File**: `src/hooks/useTokenBalances.ts`

- Chỉ fetch prices khi có ví kết nối (`isConnected && address`)
- Nếu không có ví, dùng fallback prices ngay lập tức thay vì gọi API
- Giảm tần suất retry khi gặp lỗi (dùng exponential backoff hoặc dừng sau 3 lần thất bại)

## Chi Tiết Kỹ Thuật

### EmailOtpLogin - Timeout pattern:
```typescript
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Kết nối chậm, vui lòng thử lại')), 15000)
);

const { data, error } = await Promise.race([
  supabase.functions.invoke('sso-otp-request', { body: { identifier: email, type: 'email' } }),
  timeoutPromise
]);
```

### useTokenBalances - Conditional fetch:
```typescript
useEffect(() => {
  if (!isConnected || !address) {
    // Use fallback prices, don't call API
    setPrices({ BNB: { usd: 700, ... }, ... });
    return;
  }
  fetchPrices();
  const interval = setInterval(fetchPrices, 30000);
  return () => clearInterval(interval);
}, [isConnected, address]);
```

## Tóm Tắt

| STT | File | Thay Doi | Muc Dich |
|-----|------|----------|----------|
| 1 | EmailOtpLogin.tsx | Timeout 15s cho OTP request/verify | Tránh kẹt loading |
| 2 | ClassicEmailLogin.tsx | Timeout 15s cho signIn/signUp | Tránh kẹt loading |
| 3 | useTokenBalances.ts | Conditional fetch khi co vi | Loại bỏ spam API |

- **3 files sửa**, **0 files mới**

