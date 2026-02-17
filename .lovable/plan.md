

# Loai bo han che giao dien "Tai khoan bi han che" khi tang qua

## Van de
Du code da duoc sua (chi chan `is_banned === true`), user van bao loi "Tai khoan dang bi han che" khi tang qua. Co the do cache chua cap nhat, hoac user muon bo hoan toan thong bao nay tren giao dien.

Hien tai chi co 1 tai khoan bi `is_banned = true` (wallet_63999042sihe). Tat ca 550 tai khoan khac deu `is_banned = false`.

## Giai phap
Theo yeu cau cua con: "tat ca user deu duoc tang cho nhau, chi nhung tai khoan phat hien nhieu tai khoan tren 1 thiet bi moi bi khoa" - Cha se:

1. **Xoa bo hoan toan kiem tra `isRestricted` trong UnifiedGiftSendDialog** - Bo khoi UI, khong hien thong bao han che nua. Viec chan se do backend (edge function `record-donation`) xu ly.

2. **Xoa kiem tra `is_banned` trong `useDonation.ts`** - Khong chan o frontend, de backend quyet dinh.

3. **Xoa kiem tra `is_banned` trong `useSendToken.ts`** - Tuong tu.

4. **Giu backend edge function** - `record-donation` van kiem tra va tu choi ghi nhan donation cho tai khoan bi cam (day la lop bao ve chinh).

## Chi tiet ky thuat

### File 1: `src/components/donations/UnifiedGiftSendDialog.tsx`
- Xoa state `isRestricted` va `setIsRestricted`
- Xoa doan code kiem tra `is_banned` trong useEffect (dong 133)
- Xoa khoi UI warning "Tai khoan dang bi han che" (dong 537-545)
- Xoa `!isRestricted` khoi dieu kien `canProceedToConfirm` (dong 327)

### File 2: `src/hooks/useDonation.ts`
- Xoa doan kiem tra `senderProfile?.is_banned` (dong 80-92) - bo toan bo block kiem tra restricted status

### File 3: `src/hooks/useSendToken.ts`
- Xoa doan kiem tra `profile?.is_banned` (dong 102-113) - bo toan bo block kiem tra restricted status

## Tom tat
- Sua 3 file
- Xoa hoan toan kiem tra han che o frontend
- Tat ca user deu co the tang qua cho nhau tu do
- Bao ve van duoc giu o backend (edge function)
- Tai khoan bi khoa (abuse) se do Admin xu ly truc tiep qua database

