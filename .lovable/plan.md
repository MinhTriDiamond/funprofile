

# Kết quả kiểm tra tính năng Chunked Recording & R2

## Trạng thái hiện tại

### Đã hoạt động:
- `CHUNKED_RECORDING_ENABLED = true` — tính năng đã bật
- `createChunkedRecorder` — ghi video theo chunk 2 giây, hoạt động đúng (UI hiển thị "Đang ghi")
- `createChunkUploadQueue` — hàng đợi upload với retry và offline-aware đã được khởi tạo
- `useLiveRecording` hook — tự động start khi tracks sẵn sàng, đã kết nối đúng trong `LiveHostPage`

### Vấn đề phát hiện — Upload chunk lên R2 bị lỗi (progress 0%):

Từ screenshot, badge hiển thị "Đang tải lên..." nhưng progress = **0%**. Điều này cho thấy chunk upload đang **thất bại liên tục** (retry 3 lần rồi bỏ qua). Có **2 nguyên nhân có thể**:

#### Nguyên nhân 1: `VITE_AGORA_WORKER_URL` chưa được cấu hình trong Lovable
- Frontend dùng `import.meta.env.VITE_AGORA_WORKER_URL` để gọi Worker
- Nếu biến này trống, `ensureWorkerUrl()` sẽ throw error và mọi chunk upload đều fail
- Cần kiểm tra xem biến này đã được set trong Lovable environment chưa

#### Nguyên nhân 2: Worker chưa được deploy hoặc secrets chưa đủ
- Worker cần các secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_PUBLIC_URL`
- Nếu Worker chưa deploy, endpoint `/upload/live-chunk` sẽ trả về 404 hoặc không tồn tại
- Nếu secrets thiếu, auth sẽ fail trả về 401

#### Nguyên nhân 3: CORS — origin preview chưa được thêm vào `ALLOWED_ORIGINS`
- `wrangler.toml` chỉ có 3 origins: `funprofile.lovable.app`, `id-preview--f06fbccb...lovable.app`, `localhost:5173`
- Origin thực tế từ network requests là: `f06fbccb-088c-4170-8736-4f1a09d4d572.lovableproject.com`
- Origin này **KHÔNG** nằm trong danh sách allowed → CORS bị chặn!

## Kế hoạch sửa lỗi

### 1. Thêm biến môi trường `VITE_AGORA_WORKER_URL`
- Cần con cung cấp URL Worker đã deploy (ví dụ: `https://fun-agora-rtc-token.xxx.workers.dev`)

### 2. Cập nhật `ALLOWED_ORIGINS` trong Worker
- Thêm origin `https://f06fbccb-088c-4170-8736-4f1a09d4d572.lovableproject.com` vào `wrangler.toml`
- Hoặc dùng wildcard pattern cho tất cả preview URLs

### 3. Xác nhận Worker đã deploy với đầy đủ secrets
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_PUBLIC_URL` phải được set trên Cloudflare

### 4. Cải thiện logging lỗi trong frontend
- Thêm `console.error` rõ ràng hơn khi chunk upload fail để dễ debug

