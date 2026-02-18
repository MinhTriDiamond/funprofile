
# Chuyen ket qua Quet GD thieu tu Dialog sang trang full

## Thay doi

Thay vi hien ket qua scan trong Dialog (modal nho), se chuyen sang hien thi inline ngay trong tab Donations duoi dang mot "view mode". Khi admin nhan "Quet GD thieu", ket qua se thay the noi dung chinh cua tab (bang donations) bang giao dien ket qua scan full-page voi:

- Header voi nut "Quay lai" de tro ve giao dien donations binh thuong
- Thong ke tong quan (so giao dich da quet, so thieu, so khong map duoc)
- Bang danh sach giao dich thieu full-width voi pagination
- Nut "Backfill tat ca" noi bat

## Chi tiet ky thuat

### File sua: `src/components/admin/DonationHistoryAdminTab.tsx`

1. **Them state `viewMode`**: `'donations' | 'scanResults'` de chuyen doi giua 2 giao dien
2. **Khi scan xong**: set `viewMode = 'scanResults'` thay vi `setScanDialogOpen(true)`
3. **Xoa Dialog scan**: Bo toan bo block `<Dialog>` cho scan results
4. **Them giao dien scan results inline**: Render khi `viewMode === 'scanResults'`, bao gom:
   - Header voi icon, tieu de "Ket qua quet giao dich thieu", nut "Quay lai"
   - Card thong ke: Tong da quet, GD thieu, Khong map duoc
   - Bang full-width hien thi danh sach missingTx (sender, recipient, amount, token, thoi gian)
   - Nut "Backfill tat ca" o cuoi
5. **Khi backfill xong hoac nhan "Quay lai"**: set `viewMode = 'donations'`
6. **Xoa import Dialog** neu khong con su dung o cho khac
