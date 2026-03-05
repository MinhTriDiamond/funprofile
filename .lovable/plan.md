

# Xóa chunk hiệu quả: S3 Batch Delete thay vì gọi từng cái

## Vấn đề

Đúng rồi. Với timeslice 1.5s hiện tại:
- 10 phút = ~400 chunk
- 30 phút = ~1200 chunk
- Xóa từng cái = 400-1200 lần gọi HTTP DELETE → **rất chậm và tốn tài nguyên**

## Giải pháp: S3 DeleteObjects API (Batch Delete)

R2 tương thích S3, hỗ trợ API **DeleteObjects** — xóa tối đa **1000 object trong 1 request** duy nhất.

Với video 10 phút (400 chunk) → chỉ cần **1 request**. Video 30 phút (1200 chunk) → **2 request**.

## Thay đổi cụ thể

### File: `supabase/functions/recording-finalize/index.ts`

Thêm hàm `batchDeleteFromR2(keys: string[])`:
- Gọi S3 `POST /{bucket}?delete` với body XML chứa danh sách key
- Chia thành batch 1000 key nếu cần
- Dùng AWS Signature V4 đã có sẵn trong file

```text
// Thay vì:
for (const chunk of chunks) {
  await deleteFromR2(chunk.key);  // 400 requests!
}

// Sẽ dùng:
await batchDeleteFromR2(chunks.map(c => c.key));  // 1 request!
```

### File: `supabase/functions/auto-finalize-recordings/index.ts`

Áp dụng cùng hàm `batchDeleteFromR2` cho auto-finalize.

### Quy trình hoàn chỉnh khi finalize

```text
1. Fetch manifest chunks (có sẵn)
2. Fetch từng chunk → nối thành replay.webm → upload lên R2
3. Verify file nối (HEAD request kiểm tra size)
4. Batch delete toàn bộ chunk cũ (1-2 request)
5. Xóa manifest.json (không cần nữa)
6. Update post.video_url = replay.webm
```

Tổng cộng sửa **2 file** Edge Function. Toàn bộ logic nối + xóa batch nằm trong cùng kế hoạch trước đó.

