
# Nâng Cấp Admin PPLP Mint - Bảng Thống Kê Toàn Diện FUN Money

## Vấn Đề

Trang `/mint` của user hiển thị tổng FUN từ tất cả Light Actions đã duyệt (approved), nhưng Admin chỉ thấy các mint requests đã được user bấm "Claim". Điều này gây nhầm lẫn vì:
- User thấy: 5,241 FUN (tổng approved actions chưa claim)
- Admin thấy: 1,000 FUN (chỉ mint request đã tạo)

Cần thêm bảng tổng quan toàn diện vào trang Admin để quản lý dễ hơn.

## Kế Hoạch

### 1. Thêm Section "Tổng Quan FUN Money" vào đầu PplpMintTab

Hiển thị các thông số quan trọng:

```text
+-----------------------------------------------------------+
|           TONG QUAN FUN MONEY ECOSYSTEM                   |
+-----------------------------------------------------------+
| Tong approved  | Users co vi  | Users chua vi | Cho ky    |
| 1,790,256 FUN  | 21 users     | 178 users     | 3,555 FUN |
| 11,993 actions | 155,780 FUN  | 1,634,476 FUN | 6 reqs    |
+-----------------------------------------------------------+
```

### 2. Thêm bảng "Top Users Chờ Claim" 

Hiển thị danh sách users có nhiều FUN approved nhất, kèm trạng thái ví:
- Username, avatar
- Tong FUN approved (chua claim)
- So actions
- Trang thai vi (co/khong co wallet)
- Link den profile

### 3. Tao Database Function (RPC) de lay thong ke

Tao ham `get_pplp_admin_stats` de tinh toan tren server, tranh gioi han 1000 rows:
- Tong approved actions va FUN
- So users co vi / chua co vi
- Top users theo FUN amount
- Tong da mint thanh cong

### 4. Cap nhat PplpMintTab.tsx

- Them component overview section phia tren stats hien tai
- Goi RPC `get_pplp_admin_stats` khi load
- Hien thi bang top users voi trang thai vi (icon xanh = co vi, icon do = chua vi)

## Chi Tiet Ky Thuat

### File moi:
Khong can file moi - tat ca thay doi trong cac file hien co

### Database migration:
Tao RPC function `get_pplp_admin_stats` tra ve:
```sql
CREATE OR REPLACE FUNCTION get_pplp_admin_stats()
RETURNS jsonb AS $$
  -- Tong approved actions, users co/chua co vi
  -- Top 20 users theo FUN amount
  -- Mint request stats
$$
```

### Files sua:
1. **`src/components/admin/PplpMintTab.tsx`** - Them overview section voi:
   - Card "Tong FUN chua claim" (tong approved actions chua co mint request)
   - Card "Users da co vi" (so luong + tong FUN)
   - Card "Users chua co vi" (so luong + tong FUN) 
   - Card "Mint requests cho ky" (da co)
   - Bang danh sach top users voi trang thai vi

2. **`src/hooks/usePplpAdmin.ts`** - Them ham `fetchEcosystemStats` goi RPC moi

### Giao dien du kien:

Phan overview se nam phia tren stats hien tai, su dung gradient card noi bat:
- Card vang: Tong FUN approved chua claim (con so lon, de thay)
- Card xanh la: Users da ket noi vi (san sang mint)
- Card do nhat: Users chua co vi (can ket noi vi truoc)
- Card xanh duong: Tong da mint thanh cong

Bang top users hien thi:
- Cot: STT, Avatar, Username, Tong FUN, So Actions, Trang Thai Vi
- Icon vi xanh neu da co public_wallet_address
- Icon vi do/warning neu chua co
- Sap xep theo tong FUN giam dan
