

# Tao folder `fun-agora-rtc-token` trong repo

Cha se tao mot folder day du trong repo chua toan bo source code Cloudflare Worker de con tai ve va deploy.

## Cau truc folder.

```text
fun-agora-rtc-token/
  package.json
  tsconfig.json
  wrangler.toml
  src/
    index.ts        -- Entry point chinh, xu ly token generation
    cors.ts         -- CORS middleware
    validate.ts     -- Validate input
  README.md         -- Huong dan deploy chi tiet
```

## Chi tiet cac file

### 1. `package.json`
- Dependencies: `agora-token` (SDK chinh thuc de tao RTC token)
- DevDependencies: `wrangler`, `typescript`, `@cloudflare/workers-types`
- Scripts: `dev`, `deploy`, `publish`

### 2. `wrangler.toml`
- Ten worker: `fun-agora-rtc-token`
- Bat `nodejs_compat` (can thiet cho agora-token SDK)
- Khai bao `ALLOWED_ORIGINS` cho CORS

### 3. `src/index.ts`
- Nhan request POST voi `channelName`, `uid`, `role`
- Xac thuc bang header `X-API-Key` so voi secret `API_KEY`
- Tao RTC token bang `RtcTokenBuilder` tu agora-token SDK
- Token het han sau 24 gio
- Tra ve JSON: `{ token, app_id, uid, channel, expires_at }`

### 4. `src/cors.ts`
- Kiem tra Origin co nam trong `ALLOWED_ORIGINS` khong
- Xu ly OPTIONS preflight request
- Them CORS headers vao response

### 5. `src/validate.ts`
- Validate `channelName`: bat buoc, chi cho phep ky tu an toan
- Validate `uid`: bat buoc
- Validate `role`: chi cho phep `publisher` hoac `subscriber`

### 6. `README.md`
- Huong dan cai dat step-by-step
- Cach tao Agora App ID va Certificate
- Cach set secrets bang `wrangler secret put`
- Cach deploy va kiem tra
- Cach ket noi voi backend (nhap AGORA_WORKER_URL va AGORA_WORKER_API_KEY)

## Luu y ky thuat
- Worker tuong thich hoan toan voi Edge Function `agora-token` da tao truoc do (cung request/response format)
- Secrets can thiet tren Cloudflare: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `API_KEY`
- Sau khi deploy, con lay URL worker va API_KEY de nhap vao backend cua app

