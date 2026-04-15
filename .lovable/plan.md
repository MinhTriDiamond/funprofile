

# Debug: `link_preview_cache` trống — Nguyên nhân và giải pháp

## Nguyên nhân gốc

Tại dòng 543-548 trong `fetch-link-preview/index.ts`, lệnh upsert vào DB được gọi kiểu **fire-and-forget** (không `await`):

```typescript
sb.from('link_preview_cache')
  .upsert({ url: normalizedUrl, data: result, fetched_at: ... })
  .then(({ error }) => { ... });  // ← không await
```

Ngay sau đó (dòng 551), hàm `return new Response(...)` trả kết quả cho client. Deno Edge Runtime **shutdown ngay lập tức** sau khi response được gửi → Promise upsert bị **hủy giữa chừng**, dữ liệu không bao giờ được ghi vào DB.

Logs xác nhận: hàm boot → scrape → shutdown liên tục, không có log `"Cached preview for:"` nào xuất hiện.

## Giải pháp

**Thay fire-and-forget bằng `await`** — chờ upsert xong rồi mới trả response:

```typescript
// Dòng 542-549: thay .then() bằng await
if (result.title || result.image || result.author || result.siteName) {
  const { error: upsertErr } = await sb
    .from('link_preview_cache')
    .upsert(
      { url: normalizedUrl, data: result, fetched_at: new Date().toISOString() },
      { onConflict: 'url' }
    );
  if (upsertErr) console.error('Cache upsert error:', upsertErr);
  else console.log(`Cached preview for: ${normalizedUrl}`);
}
```

## File thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/fetch-link-preview/index.ts` | Dòng 542-549: đổi `.then()` → `await` |

## Tác động

- **Trước**: 0 records trong cache, mỗi lần xem link đều scrape lại (~933ms CPU)
- **Sau**: Cache hoạt động, link đã xem trả kết quả từ DB (<50ms), tiết kiệm ~80% CPU cho link preview

