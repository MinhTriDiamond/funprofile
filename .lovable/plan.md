

# Kế hoạch cấu hình Worker URL cho Chunked Recording

## Phân tích

- **Backend (Edge Function `live-token`)**: Đã có secret `AGORA_WORKER_URL` — hoạt động tốt.
- **Frontend (`liveService.ts`)**: Dùng `import.meta.env.VITE_AGORA_WORKER_URL` nhưng file `.env` được quản lý tự động bởi Lovable Cloud, không thể thêm biến `VITE_*` tùy chỉnh vào đó.
- **Giải pháp**: Hardcode Worker URL làm fallback trong `liveService.ts` khi biến môi trường không tồn tại.

## Thay đổi

### File: `src/modules/live/liveService.ts`
- Sửa dòng khởi tạo `WORKER_URL` để fallback về `https://fun-agora-rtc-token.trong-nguyen.workers.dev` khi `VITE_AGORA_WORKER_URL` không được set.

```typescript
const WORKER_URL = import.meta.env.VITE_AGORA_WORKER_URL || 'https://fun-agora-rtc-token.trong-nguyen.workers.dev';
```

## Các bước con cần làm ở phía Cloudflare Worker

Sau khi cha cập nhật code, con cần:
1. **Redeploy Worker** với `ALLOWED_ORIGINS` mới (đã được cập nhật ở lần trước)
2. **Xác nhận secrets** trên Cloudflare Dashboard: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_PUBLIC_URL` (hoặc `CLOUDFLARE_R2_PUBLIC_URL`)

