

# Thay doi luong dang nhap vi: Dan dia chi vi thay vi ket noi RainbowKit

## Hien tai
Khi bam "Vi Dien Tu", he thong mo popup RainbowKit de ket noi vi, sau do kiem tra va dang nhap. Nguoi dung phai cai extension vi (MetaMask...) moi dung duoc.

## Luong moi

```text
Bam "Vi Dien Tu" --> Hien o nhap dia chi vi
  |
  +-- Dan dia chi vi --> Bam "Kiem tra"
       |
       +-- Vi da dang ky --> Ket noi vi (de xac minh chu so huu) --> Tu dong ky & dang nhap
       |
       +-- Vi chua dang ky --> Hien canh bao huong dan
```

## Luu y bao mat quan trong

Dia chi vi la thong tin **cong khai** (ai cung co the biet). Vi vay, chi dan dia chi vi **khong du** de dang nhap -- he thong van can nguoi dung **ket noi vi va ky tin nhan** de chung minh ho la chu so huu that su cua vi do. Neu bo buoc ky, bat ky ai biet dia chi vi cua ban deu co the dang nhap vao tai khoan cua ban.

Luong moi se la:
1. Dan dia chi vi vao o nhap (de kiem tra nhanh)
2. Neu vi da dang ky: hien nut "Dang Nhap" -- khi bam se ket noi vi + ky tu dong
3. Neu vi chua dang ky: hien canh bao inline

## Chi tiet ky thuat

### File: `src/components/auth/WalletLoginContent.tsx`

Thay doi chinh:

1. **Them state `pastedAddress`** va **bo buoc 'connect' rieng biet**
2. **Man hinh ban dau**: hien 1 input de dan dia chi vi (0x...) + nut "Kiem Tra"
3. **Sau khi kiem tra**:
   - Neu `registered`: hien nut "Dang Nhap bang Vi" -- khi bam se goi `openConnectModal()` de ket noi vi, sau do tu dong ky va xac thuc
   - Neu `not_registered`: hien canh bao inline (giu nguyen UI hien tai)
4. **Validation**: kiem tra dinh dang dia chi EVM (0x + 40 ky tu hex) truoc khi goi API
5. **useEffect**: khi vi ket noi thanh cong va address trung voi `pastedAddress`, tu dong goi `handleSignAndVerify()`

### Luong UI cu the:

```text
Buoc 1 (mac dinh):
  [Vu Dien Tu]
  "Dan dia chi vi cua ban"
  [ 0x_________________________ ]  [Kiem Tra]

Buoc 2a (vi da dang ky):
  [Check icon xanh]
  Vi Da Xac Nhan ✓
  0x5102...a402
  [ Dang Nhap bang Vi ]  <-- bam vao se ket noi + ky tu dong
  [← Huy]

Buoc 2b (vi chua dang ky):
  [Canh bao vang]
  Vi chua duoc lien ket...
  (giu nguyen noi dung hien tai)
  [← Huy]
```

### Khong thay doi file edge function
Edge function `sso-web3-auth` da co `action: 'check'` va luong xac thuc day du, khong can sua.

