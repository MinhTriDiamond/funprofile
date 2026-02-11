

# Sửa lỗi Dry Run chỉ quét được 7/165 video

## Nguyên nhân

Edge function `migrate-stream-to-r2` giới hạn kết quả khi quét:
- Query `video_url`: dùng `.limit(batchSize)` (mặc định 5) -- chỉ thấy 5 bài
- Query `media_urls`: dùng `.limit(200)` rồi filter trong code -- chỉ filter ra 2 bài có Stream URL
- Tổng: 5 + 2 = 7, trong khi thực tế DB có 155+ posts chứa Stream URL

## Giải pháp

### File: `supabase/functions/migrate-stream-to-r2/index.ts`

**1. Tách logic dry run và migration:**

Khi `dryRun = true`: dùng query **không có limit** (hoặc limit 1000) để đếm chính xác tổng số video cần migrate.

Khi `dryRun = false`: giữ nguyên `.limit(batchSize)` để xử lý từng batch.

**2. Thay đổi cụ thể:**

Dòng 67-83: Thay thế bằng logic phân biệt dry run vs migration:

```typescript
// Scan limit: dry run lấy tất cả, migration lấy theo batch
const scanLimit = dryRun ? 1000 : batchSize;

// Find posts with Stream video URLs
const { data: posts, error: queryError } = await supabaseAdmin
  .from('posts')
  .select('id, video_url, media_urls')
  .or('video_url.ilike.%videodelivery.net%,video_url.ilike.%cloudflarestream.com%')
  .limit(scanLimit);

if (queryError) throw queryError;

// Also find posts with Stream URLs in media_urls
const { data: mediaPosts, error: mediaError } = await supabaseAdmin
  .from('posts')
  .select('id, video_url, media_urls')
  .not('media_urls', 'is', null)
  .limit(1000);

if (mediaError) throw mediaError;
```

Dòng 86-91: Thêm loại bỏ trùng lặp (vì 1 post có thể xuất hiện ở cả 2 query):

```typescript
// Filter media_urls posts that contain Stream URLs
const mediaPostsWithStream = (mediaPosts || []).filter(p => {
  if (!p.media_urls || !Array.isArray(p.media_urls)) return false;
  // Bỏ qua post đã có trong danh sách video_url
  const alreadyInPosts = (posts || []).some(pp => pp.id === p.id);
  if (alreadyInPosts) return false;
  return (p.media_urls as any[]).some((m: any) => 
    m.type === 'video' && (m.url?.includes('videodelivery.net') || m.url?.includes('cloudflarestream.com'))
  );
});
```

**3. Cải thiện dry run response:** Thêm tổng số video thực tế:

```typescript
if (dryRun) {
  return new Response(JSON.stringify({
    dryRun: true,
    totalVideos: totalPosts + totalMediaPosts + totalComments,
    postsWithStreamVideoUrl: totalPosts,
    postsWithStreamMediaUrls: totalMediaPosts,
    commentsWithStreamVideo: totalComments,
    samplePosts: posts?.slice(0, 5).map(p => ({ 
      id: p.id, 
      video_url: p.video_url?.substring(0, 80) 
    })),
    sampleMediaPosts: mediaPostsWithStream.slice(0, 5).map(p => ({ id: p.id })),
  }), { ... });
}
```

## Danh sách file thay đổi

| File | Hành động | Mô tả |
|------|-----------|-------|
| `supabase/functions/migrate-stream-to-r2/index.ts` | Sửa | Dry run dùng limit 1000 thay vì batchSize; loại bỏ trùng lặp giữa 2 query |

## Kết quả mong đợi

- Dry Run sẽ hiển thị đúng ~155 posts (video_url) + posts bổ sung từ media_urls
- Migration vẫn xử lý theo batch 5 video/lần như cũ
- Không còn trùng lặp giữa video_url và media_urls

