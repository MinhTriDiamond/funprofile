

## Phân tích nguyên nhân crash

**Root cause**: Khi giao dịch Crypto Gift thành công, Edge Function `record-donation` chèn một message vào bảng `messages` với `media_urls` là **mảng JSON objects**:
```json
[{"type": "donation", "donation_id": "...", "amount": "100", "token_symbol": "CAMLY", "tx_hash": "0x..."}]
```

Chat realtime nhận message này → `MessageBubble.tsx` dòng 209-211 ép kiểu `media_urls` thành `string[]` rồi gọi `getFileTypeFromUrl(url)` trên mỗi phần tử. Nhưng phần tử là **object**, không phải string → `new URL(object)` throw → catch block gọi `object.lastIndexOf('.')` cũng throw → **crash lan ra ErrorBoundary → trang trắng "Đã xảy ra lỗi"**.

## Kế hoạch sửa

### 1. File `src/modules/chat/components/MessageBubble.tsx` (dòng 207-222)
- Trước khi render media, **tách** `media_urls` thành 2 loại:
  - `donationItems`: các object có `type === 'donation'` → render thành gift card inline (hiển thị đẹp thay vì text thô)
  - `fileUrls`: các string URL thực → render như cũ (image/video/file)
- Render donation items trước bằng một mini gift card (icon 🎁 + số tiền + token)
- Chỉ gọi `getFileTypeFromUrl()` trên string URLs

### 2. File `src/modules/chat/utils/fileUtils.ts` (phòng thủ)
- Thêm guard `if (typeof url !== 'string') return 'document'` trong `getFileTypeFromUrl` để tránh crash tương tự trong tương lai

### 3. File `src/components/donations/UnifiedGiftSendDialog.tsx` (dòng 351-373)
- Bọc `handleSend` single-send trong try/catch toàn bộ
- Nếu lỗi xảy ra sau khi có hash (celebration phase), catch lại và show toast thay vì để crash

### 4. File `src/modules/chat/components/MessageBubble.tsx` - Error boundary nội bộ
- Bọc phần render media trong try/catch (hoặc inline error boundary nhẹ) để nếu có lỗi render media thì chỉ ẩn media đó, không crash toàn bộ chat

### Chi tiết kỹ thuật

**MessageBubble.tsx** — thay đổi chính (dòng 207-222):
```tsx
{/* Media */}
{message.media_urls && Array.isArray(message.media_urls) && message.media_urls.length > 0 && (() => {
  const items = message.media_urls as unknown[];
  const donationItems = items.filter((item): item is Record<string, unknown> => 
    typeof item === 'object' && item !== null && (item as any).type === 'donation'
  );
  const fileUrls = items.filter((item): item is string => typeof item === 'string');
  
  return (
    <div className="mb-2 space-y-1">
      {donationItems.map((d, i) => (
        <div key={`donation-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-gold/10 border border-gold/30">
          <Gift className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium">
            🎁 {Number(d.amount).toLocaleString()} {String(d.token_symbol)}
          </span>
        </div>
      ))}
      {fileUrls.map((url, i) => {
        const fileType = getFileTypeFromUrl(url);
        // ... existing render logic
      })}
    </div>
  );
})()}
```

**fileUtils.ts** — guard (dòng 17):
```typescript
export function getFileTypeFromUrl(url: string): 'image' | 'video' | 'document' {
  if (typeof url !== 'string') return 'document';
  // ... existing logic
}
```

Tổng cộng sửa **3 files**, không cần thay đổi database hay Edge Functions.

