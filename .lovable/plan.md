
# Sửa lỗi Migrate Stream to R2

## Vấn đề hiện tại

Từ ảnh chụp màn hình, tất cả 5 video đều báo **"no download url"**. Có 2 nguyên nhân:

### 1. Auth sai - `getClaims` không tồn tại

Dòng 39 trong edge function dùng `supabaseAdmin.auth.getClaims(token)` - hàm này **không tồn tại** trong Supabase JS v2. Kết quả là auth luôn fail và trả về 401, nhưng frontend có thể đang hiển thị sai status.

**Sửa:** Đổi sang `supabaseAdmin.auth.getUser(token)`.

### 2. Cloudflare Stream cần thời gian chuẩn bị download

Hàm `getStreamDownloadUrl` chỉ chờ **2 giây** sau khi gọi POST enable downloads, rồi kiểm tra URL. Cloudflare Stream cần thời gian xử lý (có thể vài chục giây đến vài phút) tùy kích thước video.

**Sửa:** Thêm polling - lặp kiểm tra mỗi 3 giây, tối đa 10 lần (30 giây), cho đến khi `percentComplete === 100.0` và URL có sẵn.

## Chi tiết kỹ thuật

### File: `supabase/functions/migrate-stream-to-r2/index.ts`

**Thay đổi 1 - Auth (dòng 38-46):**
```typescript
// CU:
const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
const userId = claimsData.claims.sub;

// MOI:
const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
const userId = user.id;
```

**Thay đổi 2 - Download URL polling (dòng 222-238):**
```typescript
async function getStreamDownloadUrl(accountId, apiToken, uid) {
  // Enable downloads
  await fetch(...POST...);

  // Polling: kiểm tra mỗi 3s, tối đa 10 lần
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(3000);
    const resp = await fetch(...GET downloads...);
    const data = await resp.json();
    const url = data?.result?.default?.url;
    const percent = data?.result?.default?.percentComplete;

    if (url && percent === 100.0) return url;
    console.log(`[migrate] UID ${uid}: download ${percent}% (attempt ${attempt+1}/10)`);
  }
  return null; // Timeout sau 30s
}
```

## Tóm tắt

| Sửa | Vấn đề | Giải pháp |
|-----|--------|-----------|
| Auth | `getClaims` không tồn tại | Dùng `getUser(token)` |
| Download URL | Chờ 2s quá ngắn | Polling 10 lần x 3s = 30s |

Chỉ sửa 1 file: `supabase/functions/migrate-stream-to-r2/index.ts`
