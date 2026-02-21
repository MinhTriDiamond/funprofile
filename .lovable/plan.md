

# Fix: Tu dong hien thi nguoi nhan khi mo Crypto Gift tu chat

## Van de

Khi mo Crypto Gift tu chat, du da truyen `presetRecipient` (username + wallet address), muc "Nguoi nhan" van hien thi o thanh tim kiem trong thay vi tu dong dien thong tin nguoi nhan.

## Nguyen nhan

Trong `UnifiedGiftSendDialog.tsx` dong 176:
```
const isPresetMode = mode === 'post' || (mode === 'navbar' && !!presetRecipient?.id);
```

Dieu kien nay **khong bao gom `mode === 'wallet'`**, nen khi chat truyen `mode="wallet"` voi `presetRecipient`, dialog van hien thi giao dien tim kiem thay vi hien thi nguoi nhan da chon san.

## Cach sua

### Sua 1 dong trong `src/components/donations/UnifiedGiftSendDialog.tsx`

Dong 176, them dieu kien cho `mode === 'wallet'`:

```
// Truoc:
const isPresetMode = mode === 'post' || (mode === 'navbar' && !!presetRecipient?.id);

// Sau:
const isPresetMode = mode === 'post' || ((mode === 'navbar' || mode === 'wallet') && !!presetRecipient?.id);
```

Chi thay doi duy nhat 1 dong code. Khi `mode === 'wallet'` va co `presetRecipient.id`, dialog se:
- Tu dong hien thi thong tin nguoi nhan (avatar, username, dia chi vi)
- Khong hien thi thanh tim kiem
- San sang de chon token va nhap so luong

## File thay doi

| File | Thay doi |
|------|---------|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Them `mode === 'wallet'` vao dieu kien `isPresetMode` |

