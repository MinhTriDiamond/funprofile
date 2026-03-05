

# Khắc phục Livestream Recording thất bại sau khi thêm "Change to Single"

## Phân tích nguyên nhân gốc rễ

Sau khi kiểm tra database, Cha phát hiện:

- **5 recordings kẹt ở trạng thái `assembling`** — Edge Function timeout (giới hạn ~60s) khi cố fetch hàng trăm chunk + nối + upload lại trong 1 lần gọi duy nhất
- **15 recordings kẹt ở `recording`** — sessions vẫn `status: 'live'` với `ended_at: null`, auto-finalize bỏ qua vì nó chỉ xử lý session đã `ended`
- **Response field mismatch** — Edge Function trả về `replay_url` nhưng client đọc `manifest_url` → `playbackUrl` luôn là `null` → client nghĩ recording thất bại

### 3 lỗi cụ thể:

**Lỗi 1: Edge Function timeout** — `recording-finalize` cố fetch 100-400 chunk, buffer 5MB parts, upload multipart, verify, batch delete — tất cả trong 1 request duy nhất. Với 100+ chunk, dễ dàng vượt 60s timeout.

**Lỗi 2: Response field name sai** — Function trả `replay_url`, client đọc `manifest_url`:
```text
// Edge Function trả về:
{ success: true, replay_url: "https://..." }

// Client đọc:
data.manifest_url  →  undefined  →  playbackUrl = null  →  recordingStatus = 'failed'
```

**Lỗi 3: Auto-finalize không xử lý session stuck** — Auto-finalize chỉ tìm recordings có session `status: 'ended'`. Nhưng nhiều session bị kẹt ở `status: 'live'` mãi.

## Kế hoạch khắc phục

### Chiến lược: Quay lại manifest-based finalize (nhanh, đáng tin cậy)

Thay vì cố concat trong Edge Function (chậm, dễ timeout), quay lại tạo manifest.json — hoàn thành trong 2-3 giây. ChunkedVideoPlayer đã hỗ trợ phát manifest rồi.

Concat thành single file sẽ được thực hiện **bất đồng bộ** bởi auto-finalize (chạy từ cron), và chỉ khi Edge Function có đủ thời gian.

### File 1: `supabase/functions/recording-finalize/index.ts`

**Thay đổi**: Quay lại tạo manifest.json thay vì concat ngay lập tức
- Bỏ toàn bộ logic multipart upload, HEAD verify, batch delete
- Tạo manifest.json (danh sách chunk URLs + metadata) → upload lên R2
- Trả về `manifest_url` (khớp với client)
- Cập nhật post với manifest URL + `playback_type: 'chunked'`
- Giữ lại các hàm R2 signing vì auto-finalize cần

### File 2: `supabase/functions/auto-finalize-recordings/index.ts`

**Thay đổi 1**: Xử lý sessions kẹt ở `live`
- Thêm logic: nếu session `status: 'live'` và `created_at` > 30 phút trước → tự động đánh dấu `ended`

**Thay đổi 2**: Xử lý recordings kẹt ở `assembling`
- Nếu `assembling` > 10 phút → reset về `recording` để retry, hoặc fallback tạo manifest

**Thay đổi 3**: Concat bất đồng bộ (tùy chọn)
- Sau khi tạo manifest thành công, **thử** concat nếu chunk count nhỏ (< 50 chunks, ~2 phút video)
- Nếu quá nhiều chunk → giữ manifest, bỏ qua concat
- Nếu concat timeout → giữ manifest, không ảnh hưởng playback

### File 3: `src/modules/live/liveService.ts`

**Thay đổi**: Đảm bảo response field khớp
- Đọc cả `manifest_url` và `replay_url` từ response (backward compatible)

## Tóm tắt

```text
Trước (lỗi):
  Client → recording-finalize → fetch 400 chunks → concat → upload → TIMEOUT!
  
Sau (sửa):
  Client → recording-finalize → tạo manifest.json → upload (2s) → ✓ DONE
  Cron   → auto-finalize → concat nhỏ (< 50 chunks) hoặc giữ manifest
```

| Vấn đề | Giải pháp |
|--------|-----------|
| Edge Function timeout | Tạo manifest thay vì concat |
| Response field mismatch | Trả đúng `manifest_url` |
| Sessions kẹt `live` | Auto-close sau 30 phút |
| Recordings kẹt `assembling` | Reset + retry hoặc fallback manifest |

Tổng: sửa **3 file**. Không thay đổi database.

