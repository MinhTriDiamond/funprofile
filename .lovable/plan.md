
# Hien thi canh bao "Tai khoan bi cam" trong muc Tang Qua

## Tong quan
Khi nguoi dung tim kiem va chon nguoi nhan trong dialog Tang Qua (UnifiedGiftSendDialog), neu nguoi nhan bi cam vinh vien (`is_banned = true`), hien thi dong chu do canh bao — giong nhu trang Profile da lam.

## Thay doi

### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

**1) Cap nhat query de lay `is_banned`**
- Dong 251: Them `is_banned` vao `selectFields`
- Trong cac `data.map(...)` (dong 262 va 289): them `isBanned: !!p.is_banned` vao object tra ve

**2) Mo rong interface `ResolvedRecipient`**
- Them truong `isBanned?: boolean` (dong 58-65)

**3) Hien thi canh bao trong danh sach ket qua tim kiem (search results)**
- Dong 956-979: Trong moi item ket qua, neu `result.isBanned === true`:
  - Hien thi dong chu do "Tai khoan bi cam vinh vien" ngay duoi `@username`
  - Icon canh bao mau do ben canh ten

**4) Hien thi canh bao trong chip nguoi nhan da chon**
- Dong 906-925: Trong moi chip, neu `r.isBanned === true`:
  - Doi border/background thanh mau do nhe (`bg-red-50 border-red-300`)
  - Them dong text nho mau do "Bi cam"

**5) Hien thi canh bao trong khung preset recipient (khi tang tu profile/chat)**
- Dong 871-895: Khi `effectiveRecipients[0]` co `isBanned === true`:
  - Hien thi khung canh bao do giong trang Profile: "Tai khoan bi cam vinh vien — Tai khoan nay da vi pham dieu khoan su dung."

**6) Truyen `isBanned` tu presetRecipient**
- Khi dung preset mode, can kiem tra `is_banned` cua nguoi nhan tu DB
- Them 1 query nho khi `presetRecipient?.id` co gia tri, fetch `is_banned` tu `public_profiles` view
- Cap nhat `effectiveRecipients` useMemo de bao gom `isBanned`

## Luu y
- KHONG chan nguoi dung gui (vi theo memory, viec chan giao dich thuc hien o Backend Edge Functions, khong chan o frontend)
- Chi hien thi canh bao de nguoi dung biet truoc khi gui
- Su dung `public_profiles` view (co `is_banned`) de tranh van de RLS
