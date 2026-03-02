

# Loai bo CF Worker - Tao Agora token truc tiep trong Edge Function

## Van de hien tai

Luong hien tai di qua 2 lop trung gian khong can thiet:

```text
Browser --> agora-token Edge Function --> CF Worker --> agora-token npm --> tra token
Browser --> live-token Edge Function --> CF Worker --> agora-token npm --> tra token
```

CF Worker chi lam duy nhat 1 viec: goi thu vien `agora-token` (npm) de tao RTC token. Viec nay hoan toan co the lam truc tiep trong Edge Function.

## Giai phap

Import `agora-token` qua `npm:agora-token` trong Deno va tao token truc tiep:

```text
Browser --> agora-token Edge Function --> tra token (truc tiep)
Browser --> live-token Edge Function --> tra token (truc tiep)
```

## Loi ich

| Truoc | Sau |
|---|---|
| 3 thanh phan (Browser, Edge Function, CF Worker) | 2 thanh phan (Browser, Edge Function) |
| Can deploy CF Worker rieng | Khong can deploy gi them |
| 4 secrets (APP_ID, CERTIFICATE, WORKER_URL, WORKER_API_KEY) | 2 secrets (APP_ID, CERTIFICATE) |
| Do tre cao hon (Edge Function goi HTTP den Worker) | Nhanh hon ~100-200ms |
| CF Worker co the down rieng | It diem loi hon |

## Chi tiet thay doi

### 1. Cap nhat agora-token Edge Function

File: `supabase/functions/agora-token/index.ts`

- Import `RtcTokenBuilder, RtcRole` tu `npm:agora-token`
- Doc `AGORA_APP_ID` va `AGORA_APP_CERTIFICATE` tu `Deno.env`
- Goi `RtcTokenBuilder.buildTokenWithUserAccount()` truc tiep
- Bo toan bo logic goi CF Worker qua `fetch(workerUrl, ...)`
- Giu nguyen logic xac thuc user va kiem tra participant

### 2. Cap nhat live-token Edge Function

File: `supabase/functions/live-token/index.ts`

- Import `RtcTokenBuilder, RtcRole` tu `npm:agora-token`
- Doc `AGORA_APP_ID` va `AGORA_APP_CERTIFICATE` tu `Deno.env`
- Goi `RtcTokenBuilder.buildTokenWithUid()` voi `numericUid` (da co san ham `uuidToNumericUid`)
- Bo toan bo logic goi CF Worker (`workerUrl`, `workerApiKey`, `fetch(workerUrl, ...)`)
- Giu nguyen logic xac thuc user, kiem tra session, kiem tra host

### 3. Them 2 secrets vao Lovable Cloud

- `AGORA_APP_ID`: App ID tu Agora Console
- `AGORA_APP_CERTIFICATE`: App Certificate tu Agora Console

(Neu da co san thi khong can them)

### 4. Don dep

- Bo 3 secrets khong con can: `AGORA_WORKER_URL`, `AGORA_WORKER_API_KEY`, `LIVE_AGORA_WORKER_URL`
- Thu muc `fun-agora-rtc-token/` co the luu tru hoac xoa -- khong con can deploy

### 5. Cap nhat client code

File: `src/lib/agoraRtc.ts`
- Khong can thay doi gi -- client van goi `supabase.functions.invoke('agora-token')` va `supabase.functions.invoke('live-token')` nhu cu

## Danh sach file thay doi

| File | Thay doi |
|---|---|
| `supabase/functions/agora-token/index.ts` | Tao token truc tiep bang `agora-token` npm, bo goi CF Worker |
| `supabase/functions/live-token/index.ts` | Tao token truc tiep bang `agora-token` npm, bo goi CF Worker |

## Rui ro

- **Rat thap**: Thu vien `agora-token` npm tuong thich Deno (chi dung Node.js crypto, Deno ho tro day du)
- **Khong anh huong client**: Client code van goi cung Edge Function, response format giu nguyen
- **Du lieu an toan**: Khong thay doi database hay storage

