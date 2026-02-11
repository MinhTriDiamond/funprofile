

# Chuyen Giao Dien Lich Su Giao Dich Sang Dang The (Card Layout)

## Tong quan
Thay the giao dien bang (Table) hien tai bang giao dien dang the (Card) giong Hinh 1 do nguoi dung yeu cau. Moi giao dich la 1 the rieng biet voi bo cuc ro rang.

---

## Thay doi duy nhat: `src/components/donations/SystemDonationHistory.tsx`

### Bo cuc moi cho moi giao dich (Desktop) - giong Hinh 1:

```text
+------------------------------------------------------------------+
| [Avatar] TEN NGUOI GUI    -->    TEN NGUOI NHAN [Avatar]         |
|          0xABC...1234 [Copy][Link]   0xDEF...5678 [Copy][Link]   |
|                                                                   |
| [Tang thuong] [Onchain]                    9.999 CAMLY           |
|                                                                   |
| "Loi nhan chuc mung day du hien thi o day..."                    |
|                                                                   |
| [V] Thanh cong  ·  21:37 09/02/2026  ·  BSC                     |
|                TX: 0x24219...  [Copy][Link]      [Fire] Xem Card |
+------------------------------------------------------------------+
```

### Chi tiet thay doi:
1. **Xoa Table desktop** (dong 388-505): Thay bang danh sach card
2. **Moi card** la 1 `div` voi border, rounded, padding, hover effect
3. **Dong 1**: Sender (trai) voi Avatar + Ten + Wallet --- Arrow --> --- Recipient (phai) voi Avatar + Ten + Wallet
4. **Dong 2**: Badges "Tang thuong" + "Onchain" ben trai, So tien + Token ben phai (mau do/cam noi bat)
5. **Dong 3**: Loi nhan in nghieng, trong dau ngoac kep, hien thi day du (khong truncate)
6. **Dong 4 (footer)**: Trang thai + Thoi gian + BSC + TX Hash voi Copy/Link + Nut "Xem Card"

### Mau sac:
- So tien CAMLY: `text-red-500 font-bold`
- So tien USDT: `text-green-600 font-bold`
- Card background: `bg-white/95 border border-green-200`
- Loi nhan: `text-gray-600 italic`

### Giu nguyen:
- Stats Cards (4 the tren cung)
- Bo loc (filters)
- Mobile layout (da tot)
- Pagination
- Celebration Cards

---

## Tong hop

| File | Thay doi |
|------|----------|
| `src/components/donations/SystemDonationHistory.tsx` | Thay Table desktop bang Card layout giong Hinh 1 |

