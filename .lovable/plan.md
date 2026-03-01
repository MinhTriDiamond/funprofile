
# Sửa lỗi Migrate Stream to R2

## Nguyên nhân gốc

Từ logs, tất cả video đều stuck ở **0% download** qua 10 lần polling. Có 2 nguyên nhân:

### 1. Sai API Token (nguyên nhân chính)
Function đang dùng `CLOUDFLARE_API_TOKEN` (dành cho Cloudflare Images), nhưng tất cả các function khác truy cập Cloudflare Stream đều dùng `CLOUDFLARE_STREAM_API_TOKEN`. Token sai nên API trả về 0% hoặc không có dữ liệu.

### 2. Timeout Edge Function
Xử lý tuần tự 5 video, mỗi video polling 30s = **150 giây tổng cộng**. Edge Function timeout ~60s nên bị "Failed to fetch".

## Giải pháp

### File: `supabase/functions/migrate-stream-to-r2/index.ts`

**Thay doi 1 - Dung dung token:**
```typescript
// CU (sai):
const cfApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')!;

// MOI (dung):
const cfApiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN')!;
```

**Thay doi 2 - Xu ly 1 video moi batch thay vi 5:**
Giam `batchSize` mac dinh tu 5 xuong 1 de tranh timeout. Frontend co the goi nhieu lan.

**Thay doi 3 - Log response de debug:**
Them log response tu Cloudflare POST enable downloads va GET status de de debug neu van con loi.

**Thay doi 4 - Giam polling xuong 5 lan (15s):**
Voi token dung, download thuong san sang nhanh. Giam tu 10 lan (30s) xuong 5 lan (15s) de vua trong timeout.

### File: `src/pages/AdminMigration.tsx`

**Thay doi 5 - Giam batch size mac dinh:**
Doi `batchSize: 5` thanh `batchSize: 1` trong frontend de xu ly tung video mot, dam bao khong timeout.

## Tom tat

| Van de | Nguyen nhan | Giai phap |
|--------|------------|-----------|
| 0% download | Sai token (`CLOUDFLARE_API_TOKEN` thay vi `CLOUDFLARE_STREAM_API_TOKEN`) | Doi sang dung token |
| Failed to fetch | 5 video x 30s = 150s > timeout | Batch size = 1, polling = 5 lan |
