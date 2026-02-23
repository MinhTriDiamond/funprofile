

# Sửa Lỗi Edge Function Khi Xem Live Stream

## Nguyên nhân

Trong edge function `live-token`, khi người xem (audience) yêu cầu token, trường `uid` được gửi là `undefined` (dòng 88):

```typescript
uid: role === 'host' ? userId : undefined,
```

Agora Worker yêu cầu `uid` bắt buộc, nên trả về lỗi 400: `{"error":"uid is required"}`.

## Giải pháp

Sửa 1 dòng trong file `supabase/functions/live-token/index.ts` (dòng 88): luôn gửi `uid` -- dùng `userId` cho cả host lẫn audience.

```typescript
// Trước
uid: role === 'host' ? userId : undefined,

// Sau
uid: userId,
```

Audience cũng cần có `uid` để Agora Worker tạo token hợp lệ. Việc dùng `userId` (UUID) cho cả hai vai trò là hoàn toàn an toàn vì Worker sẽ dùng `buildTokenWithUserAccount` để tạo token dựa trên UUID.

## Chi tiết kỹ thuật

### File: `supabase/functions/live-token/index.ts`

Dòng 86-90, thay đổi body gửi đến Worker:

```typescript
body: JSON.stringify({
  channelName: channel,
  uid: userId,
  role: role === 'host' ? 'publisher' : 'subscriber',
}),
```

Chỉ sửa 1 dòng trong 1 file duy nhất.
