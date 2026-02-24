

# Cai thien luong dang nhap vi -- Kiem tra vi truoc khi dang nhap

## Van de

Hien tai khi nguoi dung ket noi vi, he thong hien nut "Dang Nhap bang Vi". Nguoi dung bam vao, phai ky message, roi moi nhan duoc loi "Vi chua duoc ket noi!" (WALLET_NOT_REGISTERED). Dieu nay gay nham lan vi:

1. Thong bao "Vi chua duoc ket noi" nghe nhu loi ket noi, nhung thuc ra la vi chua duoc dang ky trong he thong
2. Nguoi dung phai ky message (mat thoi gian) roi moi biet vi chua dang ky
3. Thong bao toast hien ben duoi, de bi bo qua

## Giai phap

Them buoc **kiem tra vi truoc** ngay sau khi ket noi thanh cong. Neu vi chua dang ky, hien thong bao ro rang ngay trong giao dien (khong phai toast) va an nut dang nhap.

### Luong moi:

```text
Ket noi vi --> Kiem tra vi trong database
  |
  +-- Vi da dang ky --> Hien nut "Dang Nhap bang Vi" --> Ky & xac thuc --> Vao app
  |
  +-- Vi chua dang ky --> Hien thong bao huong dan inline (khong can ky)
```

## Chi tiet ky thuat

### File 1: `supabase/functions/sso-web3-auth/index.ts`

Them mode `check` de kiem tra vi nhanh ma khong can ky:

- Khi nhan `action: "check"` va `wallet_address`, chi kiem tra xem vi co trong database khong
- Tra ve `{ registered: true/false }` ma khong can signature
- Van giu rate limiting

### File 2: `src/components/auth/WalletLoginContent.tsx`

- Them state `walletStatus`: `'checking' | 'registered' | 'not_registered' | null`
- Sau khi vi ket noi (useEffect), goi API check de kiem tra vi
- Neu `registered = true`: hien nut "Dang Nhap bang Vi" nhu binh thuong
- Neu `registered = false`: hien thong bao inline voi huong dan cu the:
  - "Vi nay chua duoc lien ket voi tai khoan nao"
  - "Neu da co tai khoan: dang nhap bang email/Google va ket noi vi trong cai dat"
  - "Neu chua co tai khoan: dang ky moi va dan dia chi vi khi dang ky"
- Cap nhat thong bao loi toast tu "Vi chua duoc ket noi" thanh "Vi chua duoc lien ket voi tai khoan nao" (ro rang hon)

### Giao dien khi vi chua dang ky:

```text
  [Check icon mau vang/cam]
  Vi Chua Duoc Lien Ket

  0x5102...a402

  Vi nay chua duoc lien ket voi tai khoan nao tren FUN Profile.

  - Neu ban da co tai khoan, hay dang nhap bang Email hoac Google,
    sau do ket noi vi trong phan Cai Dat.
  - Neu chua co tai khoan, hay dang ky moi.

  [← Huy]
```

## Ket qua mong doi

1. Nguoi dung khong phai ky message vo ich khi vi chua dang ky
2. Thong bao huong dan hien ro rang ngay trong giao dien, khong bi mat trong toast
3. Khi vi da dang ky, bam "Dang Nhap bang Vi" se ky va vao app nhu binh thuong

