
## Chinh sua hien thi the donation card ro rang hon

### Van de
Chu "RICH" (z-index 10001) van bay len tren the card (z-index 10002) khien noi dung the bi che khuat. Nguyen nhan la cac portal render doc lap vao document.body nen z-index chua du cach biet de dam bao thu tu hien thi.

### Giai phap
Giam z-index cua RichTextOverlay tu 10001 xuong 9999 (ngang voi confetti/celebration effects), de the donation card (z-index 10002) va dialog overlay (z-index 10002) nam hoan toan phia tren chu RICH.

### Chi tiet ky thuat

**File: `src/components/donations/RichTextOverlay.tsx`**
- Doi `z-[10001]` thanh `z-[9999]` (line 43)

Ket qua: Thu tu hien thi se la:
1. Confetti + dong tien roi (z-9998-9999)
2. Chu RICH bay (z-9999)
3. Dialog overlay nen toi (z-10002)
4. The donation card (z-10002) -- hien thi ro rang nhat
