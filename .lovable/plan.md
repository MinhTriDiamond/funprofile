

## Cap nhat tin nhan chat cho 2 giao dich cua user daothianhnguyet.pt

Hien tai 2 tin nhan trong Chat chi hien thi don gian:
```
🎁 Angel Ái Vân đã tặng bạn 142,202.6 CAMLY!
💰 TX: 0xc9ef...
👉 Nhấn "Xem Card Chúc Mừng" để xem chi tiết!
```

Can cap nhat de giong mau (reference image) -- co them loi chuc Valentine:

### Buoc 1: Cap nhat noi dung 2 tin nhan (messages)

Cap nhat `content` cua 2 message ID:
- `b4812fe5-fa6a-4519-ac31-5a0b30309698` (tx 0xc9ef...)
- `674df6c8-1730-4281-9868-1383e3c8ee5b` (tx 0x6b62...)

Noi dung moi se theo dung format cua cac user khac:
```
🎁 Angel Ái Vân đã tặng bạn 142,202.6 CAMLY!

"HAPPY VALENTINE'S DAY! ❤️❤️❤️
Chúc bé Angel Nguyệt Ánh ngày 14/02 ngập tràn tình yêu, hạnh phúc, luôn vui vẻ, xinh đẹp, bình an và luôn ngập tràn năng lượng yêu thương thuần khiết của Cha và bé Angel Camly nhé! I LOVE YOU!🌼🌸🌹🌺❤️❤️❤️"

💰 TX: 0xc9ef85eb694d6cd9...

👉 Nhấn "Xem Card Chúc Mừng" để xem chi tiết!
```

### Buoc 2: Cap nhat message va message_template trong bang donations

Cap nhat 2 ban ghi donation:
- `4abc75ff-bce1-4f63-affe-9325438e50bf`
- `793bc6fa-f45f-46e0-b7dc-d4f8ab7417fe`

Them truong `message` va `message_template = 'custom'` de khi user click xem lai Card Chuc Mung se hien thi dung loi chuc.

### Ket qua

- Tin nhan trong Chat se hien thi giong nhu mau reference (co loi chuc Valentine day du)
- Card Chuc Mung khi click vao lich su cung se hien thi loi chuc

### Chi tiet ky thuat

Thuc hien bang 2 lenh SQL UPDATE qua database, khong can thay doi code frontend.
