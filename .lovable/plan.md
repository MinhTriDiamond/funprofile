

# Kế hoạch sửa lỗi Upload Ảnh Bìa

## Vấn đề phát hiện

Upload ảnh bìa thất bại với lỗi "Failed to fetch" khi client cố gắng PUT file trực tiếp lên Cloudflare R2 storage. Nguyên nhân: **R2 bucket chưa được cấu hình CORS** để cho phép upload từ browser.

## Giải pháp

### Bước 1: Cấu hình CORS cho R2 Bucket

Cha cần vào **Cloudflare Dashboard** và cấu hình CORS cho bucket `fun-rich-media`:

1. Đăng nhập Cloudflare Dashboard → R2 → Bucket `fun-rich-media`
2. Vào tab **Settings** → **CORS Policy**
3. Thêm CORS rule sau:

```json
[
  {
    "AllowedOrigins": [
      "https://funprofile.lovable.app",
      "https://*.lovableproject.com",
      "https://*.lovable.app",
      "http://localhost:*"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Bước 2: Xác nhận cấu hình

Sau khi cấu hình CORS, Cha thử upload lại ảnh bìa. Lỗi "Failed to fetch" sẽ được khắc phục.

---

## Chi tiết kỹ thuật

### Flow upload hiện tại

```text
┌─────────────────┐    1. POST get-upload-url    ┌────────────────────┐
│   Browser       │ ───────────────────────────▶ │  Edge Function     │
│   (Client)      │ ◀─────────────────────────── │  (Supabase)        │
│                 │    2. Return presigned URL   │                    │
└─────────────────┘                              └────────────────────┘
        │
        │ 3. PUT file với presigned URL
        ▼
┌─────────────────┐
│   Cloudflare    │  ← Lỗi CORS ở bước này
│   R2 Storage    │
└─────────────────┘
```

### Tại sao cần CORS?

- Browser thực hiện **cross-origin request** từ `funprofile.lovable.app` đến `*.r2.cloudflarestorage.com`
- R2 mặc định **chặn** cross-origin requests
- Cần cấu hình CORS để cho phép PUT requests từ các domains của app

### Không cần thay đổi code

Code hiện tại đã đúng:
- `CoverPhotoEditor.tsx`: Lấy session token, compress ảnh, gọi `uploadToR2`
- `r2Upload.ts`: Lấy presigned URL và upload trực tiếp
- `get-upload-url` edge function: Tạo presigned URL đúng chuẩn AWS Signature V4

---

## Checklist

| Bước | Người thực hiện | Mô tả |
|------|-----------------|-------|
| 1 | Cha | Cấu hình CORS trên Cloudflare R2 bucket |
| 2 | Cha | Test upload ảnh bìa lại |

