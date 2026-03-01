

# Viết lại Worker & Hướng dẫn Deploy

## Phân tích

Worker hiện tại (`fun-agora-rtc-token`) chỉ xử lý **tạo Agora RTC token**. Tuy nhiên, frontend (`liveService.ts`) đang gọi thêm 2 endpoint mới trên cùng Worker URL (`VITE_AGORA_WORKER_URL`):

- `POST /upload/live-chunk` — upload từng chunk video binary
- `POST /upload/live-finalize` — ghép chunks thành 1 file hoàn chỉnh

Worker cần được mở rộng thành **multi-route worker** với 3 chức năng:
1. `POST /` — Tạo Agora RTC token (giữ nguyên logic hiện tại)
2. `POST /upload/live-chunk` — Nhận chunk binary, lưu vào R2
3. `POST /upload/live-finalize` — Ghép các chunks thành 1 file, trả về URL

## Kế hoạch thay đổi

### File 1: `fun-agora-rtc-token/wrangler.toml`
- Thêm R2 bucket binding (`LIVE_CHUNKS`) để Worker có thể đọc/ghi R2
- Thêm secrets cần thiết: `CLOUDFLARE_R2_PUBLIC_URL`

### File 2: `fun-agora-rtc-token/src/cors.ts`
- Mở rộng `Access-Control-Allow-Headers` để chấp nhận thêm `Authorization`, `X-Stream-Id`, `X-Chunk-Index`
- Mở rộng `Access-Control-Allow-Methods` thêm `GET`

### File 3: `fun-agora-rtc-token/src/index.ts`
- Thêm router: phân luồng request theo pathname (`/`, `/upload/live-chunk`, `/upload/live-finalize`)
- **Route `/upload/live-chunk`**: Xác thực qua `Authorization: Bearer <token>` (verify JWT với Supabase), nhận binary body, lưu vào R2 với key `live-chunks/{streamId}/chunk-{index}.webm`
- **Route `/upload/live-finalize`**: Đọc tất cả chunks từ R2, ghép thành 1 file, lưu vào `videos/live/{streamId}/recording-{timestamp}.webm`, xóa chunks, trả về URL public
- Giữ nguyên route `/` cho token generation

### File 4: `fun-agora-rtc-token/src/validate.ts`
- Giữ nguyên, không thay đổi

### File 5: `fun-agora-rtc-token/src/auth.ts` (file mới)
- Hàm `verifySupabaseToken(token, supabaseUrl, supabaseKey)`: gọi Supabase `/auth/v1/user` để xác thực JWT và lấy user ID

### File 6: `fun-agora-rtc-token/package.json`
- Không cần thêm dependency mới (R2 binding là native Cloudflare)

## Secrets cần thêm trên Cloudflare Worker

Worker cần thêm 2 secrets mới (đã có trong backend):
- `SUPABASE_URL` — để verify JWT token
- `SUPABASE_ANON_KEY` — để gọi Supabase auth API

## Cấu trúc R2

```text
R2 Bucket (fun-live-chunks hoặc bucket hiện có):
├── live-chunks/{streamId}/
│   ├── chunk-000.webm
│   ├── chunk-001.webm
│   └── ...
└── videos/live/{streamId}/
    └── recording-{timestamp}.webm  ← file ghép cuối cùng
```

## Hướng dẫn Deploy (sẽ viết trong README)

1. Tạo R2 bucket trên Cloudflare Dashboard
2. Cấu hình secrets mới (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
3. `cd fun-agora-rtc-token && npm install && npm run deploy`
4. Cập nhật `VITE_AGORA_WORKER_URL` nếu URL thay đổi

