# Fun Agora RTC Token Worker

Cloudflare Worker tạo Agora RTC token cho video/voice call.

## Yêu cầu

- Node.js >= 18
- Cloudflare account (free tier OK)
- Agora account (lấy App ID + App Certificate)

## Cài đặt

```bash
cd fun-agora-rtc-token
npm install
```

## Lấy Agora credentials

1. Vào [Agora Console](https://console.agora.io/)
2. Tạo project mới (hoặc dùng project có sẵn)
3. Bật **App Certificate** (Security > Primary Certificate)
4. Copy **App ID** và **App Certificate**

## Cấu hình secrets trên Cloudflare

```bash
# App ID từ Agora Console
npx wrangler secret put AGORA_APP_ID
# → Paste App ID

# App Certificate từ Agora Console  
npx wrangler secret put AGORA_APP_CERTIFICATE
# → Paste Certificate

# API Key tự tạo (chuỗi bất kỳ >= 32 ký tự, dùng để xác thực request)
npx wrangler secret put API_KEY
# → Paste API key tự tạo (ví dụ: openssl rand -hex 32)
```

## Deploy

```bash
npm run deploy
```

Worker sẽ được deploy tại: `https://fun-agora-rtc-token.<your-subdomain>.workers.dev`

## Test

```bash
curl -X POST https://fun-agora-rtc-token.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY_ban_da_tao>" \
  -d '{"channelName": "test-channel", "uid": "user123", "role": "publisher"}'
```

Response:
```json
{
  "token": "007eJxT...",
  "app_id": "your_app_id",
  "uid": "user123",
  "channel": "test-channel",
  "expires_at": 1234567890
}
```

## Kết nối với backend

Sau khi deploy thành công, cần nhập 2 secrets vào backend của app:

1. **AGORA_WORKER_URL**: URL của worker (ví dụ: `https://fun-agora-rtc-token.your-subdomain.workers.dev`)
2. **AGORA_WORKER_API_KEY**: Chính là API_KEY đã tạo ở bước trên

## Dev local

```bash
npm run dev
```

Worker sẽ chạy tại `http://localhost:8787`

## Cấu trúc

```
src/
  index.ts      - Entry point, xử lý token generation
  cors.ts       - CORS middleware
  validate.ts   - Validate input
```
