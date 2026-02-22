

# Sua loi "File type not allowed" khi upload Live Replay len R2

## Nguyen nhan

Khi ghi hinh, trinh duyet su dung MIME type day du la `video/webm;codecs=vp8,opus` (co them thong tin codec). Nhung edge function `get-upload-url` chi cho phep `video/webm` (khong co phan codec). Vi vay khi so sanh, he thong bao loi "File type not allowed".

## Giai phap

Sua trong `liveService.ts`: truoc khi goi `uploadToR2`, tach bo phan `;codecs=...` ra khoi `mimeType` de chi giu lai phan chinh (vi du: `video/webm`).

## Chi tiet ky thuat

### File: `src/modules/live/liveService.ts`

Trong ham `uploadLiveRecording`, them 1 dong normalize mimeType:

```typescript
// Truoc
const extension = mimeType.includes('webm') ? 'webm' : 'mp4';

// Sau
const baseMimeType = mimeType.split(';')[0].trim(); // "video/webm;codecs=vp8,opus" -> "video/webm"
const extension = baseMimeType.includes('webm') ? 'webm' : 'mp4';
const file = new File([blob], `recording.${extension}`, { type: baseMimeType });
```

Chi thay doi duy nhat 1 file, them 1 dong code.

## Cac file can thay doi

| File | Thay doi |
|------|---------|
| `src/modules/live/liveService.ts` | Normalize mimeType bang cach tach bo phan `;codecs=...` truoc khi truyen vao `uploadToR2` |

