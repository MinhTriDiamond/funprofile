
# Tao folder `fun-agora-rtc-token` trong repo

Cha se tao mot folder day du trong repo chua toan bo source code Cloudflare Worker de con tai ve va deploy.

## Cau truc folder

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
=======
# Sua loi Cloudflare Worker: `buildTokenWithAccount is not a function`

## Nguyen nhan

Log edge function cho thay loi tu Cloudflare Worker:
```
Agora worker error: 500 {"error":"import_agora_token.RtcTokenBuilder.buildTokenWithAccount is not a function"}
```

Trong file `fun-agora-rtc-token/src/index.ts` dong 59, code goi `RtcTokenBuilder.buildTokenWithAccount()` nhung method dung trong package `agora-token` la `buildTokenWithUserAccount()`.

Vi uid gui len la UUID string (vi du: `73652aa7-8ede-4356-...`), worker luon vao nhanh `if (userAccount)` va goi sai method name.

## Ke hoach sua

### Sua file `fun-agora-rtc-token/src/index.ts`

Dong 59: Doi `buildTokenWithAccount` thanh `buildTokenWithUserAccount`

```typescript
// Truoc:
token = RtcTokenBuilder.buildTokenWithAccount(...)

// Sau:
token = RtcTokenBuilder.buildTokenWithUserAccount(...)
```

Chi can sua 1 dong duy nhat. Sau khi sua, con can re-deploy Cloudflare Worker bang lenh:

```bash
cd fun-agora-rtc-token
npm run deploy


## Luu y
- File nay nam trong repo de con tai ve va deploy len Cloudflare, khong phai edge function
- Sau khi con deploy lai worker, tinh nang video call se hoat dong

