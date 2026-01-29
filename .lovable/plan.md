

# Kế Hoạch Thêm Admin và Hướng Dẫn Claim CAMLY

## Phần 1: Hướng Dẫn Claim 301,000 CAMLY

### Quy trình Claim CAMLY:

```text
┌─────────────────────────────────────────────────────────────────┐
│                   FLOW CLAIM CAMLY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BƯỚC 1: User tích lũy thưởng                                  │
│     └── Đã có: 301,000 CAMLY ✅                                 │
│                                                                 │
│  BƯỚC 2: Admin vào /admin → "Duyệt thưởng"                     │
│     └── Tìm user → Click "Duyệt" ⏳                            │
│     └── reward_status = 'approved'                             │
│                                                                 │
│  BƯỚC 3: User vào /wallet                                      │
│     └── Thấy nút "Claim to Wallet"                             │
│     └── Kết nối External Wallet (MetaMask, Bitget...)          │
│     └── Nhập số lượng → Confirm                                 │
│                                                                 │
│  BƯỚC 4: Nhận CAMLY                                            │
│     └── CAMLY được chuyển từ Treasury → Ví user                │
│     └── Xem transaction trên BscScan                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vấn đề hiện tại:
- **reward_status = 'pending'** → Nút Claim bị vô hiệu hóa
- Cần Admin duyệt trước thì mới claim được

## Phần 2: Thêm User hoangtydo88 Làm Admin

### Thông tin User:

| Field | Value |
|-------|-------|
| Username | Hoangtydo88 |
| User ID | `9796f573-49d4-474d-be26-af0d23be2e39` |
| Role hiện tại | user |
| Role cần thêm | admin |

### SQL Migration cần chạy:

```sql
-- Thêm role 'admin' cho user hoangtydo88
INSERT INTO public.user_roles (user_id, role)
VALUES ('9796f573-49d4-474d-be26-af0d23be2e39', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Sau khi thêm Admin:

1. User **Hoangtydo88** có thể truy cập `/admin`
2. Vào tab **"🎁 Duyệt thưởng"**
3. Tự duyệt cho chính mình hoặc duyệt cho users khác
4. Sau khi reward_status = 'approved', vào `/wallet` để claim

## Phần 3: Hướng Dẫn Tự Duyệt Thưởng Cho Chính Mình

### Bước 1: Truy cập Admin Dashboard
```
URL: https://funprofile.lovable.app/admin
```

### Bước 2: Chọn tab "🎁 Duyệt thưởng"

### Bước 3: Tìm và duyệt
- Tìm username "Hoangtydo88" trong danh sách
- Click nút **"Duyệt"** màu xanh

### Bước 4: Claim
- Quay lại `/wallet`
- Nút "Claim to Wallet" sẽ active
- Kết nối ví external (MetaMask, Bitget, Trust...)
- Nhập số lượng 301,000 CAMLY
- Confirm và đợi transaction

## Tóm Tắt Thay Đổi

| Task | Action | File/Location |
|------|--------|---------------|
| 1. Thêm Admin | SQL Migration | Database: user_roles |
| 2. Duyệt thưởng | UI Action | /admin → Duyệt thưởng |
| 3. Claim CAMLY | UI Action | /wallet → Claim to Wallet |

## Lưu Ý Quan Trọng

- Mỗi lần claim tốn gas fee BSC (~$0.01-0.05)
- Cần có BNB trong ví để trả gas fee
- Treasury Wallet phải có đủ CAMLY để chuyển

