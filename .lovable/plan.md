

# 🛡️ Kế Hoạch Thêm Nút Admin & Hướng Dẫn Test Mint FUN

## 📋 Tổng Quan

Thêm nút "Admin Dashboard" cho users có role **admin**, hiển thị ở 2 vị trí:
1. **Desktop**: Trong Dropdown Menu (Avatar) của Navbar
2. **Mobile/Tablet**: Trong Sidebar Menu

---

## 🔧 Thay Đổi Kỹ Thuật

### File 1: `src/components/layout/FacebookNavbar.tsx`

**Thêm:**
- Import icon `Shield` từ `lucide-react`
- State `isAdmin` để lưu trạng thái quyền
- Gọi RPC `has_role` trong `useEffect` để kiểm tra quyền admin
- Thêm menu item "Admin Dashboard" trong `DropdownMenuContent` (trước nút Logout)

```text
┌─────────────────────────────────────────┐
│  [Avatar] Username                      │
├─────────────────────────────────────────┤
│  🌐 Language                     [VI ▼] │
├─────────────────────────────────────────┤
│  🛡️ Admin Dashboard      ← CHỈ ADMIN    │
├─────────────────────────────────────────┤
│  🚪 Đăng xuất                           │
└─────────────────────────────────────────┘
```

---

### File 2: `src/components/feed/FacebookLeftSidebar.tsx`

**Thêm:**
- Import icon `Shield` từ `lucide-react`
- State `isAdmin` để lưu trạng thái quyền
- Gọi RPC `has_role` trong `useEffect`
- Thêm button "Admin Dashboard" trong Card 3 (Menu) - trước nút Logout

```text
┌─────────────────────────────────────────┐
│  Menu                                   │
├─────────────────────────────────────────┤
│  🌐 Ngôn ngữ                            │
│  🛡️ Admin Dashboard      ← CHỈ ADMIN    │
│  🚪 Đăng xuất                           │
└─────────────────────────────────────────┘
```

---

## 📁 Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/components/layout/FacebookNavbar.tsx` | Thêm state isAdmin, RPC check, menu item |
| `src/components/feed/FacebookLeftSidebar.tsx` | Thêm state isAdmin, RPC check, button |

---

## ⏱️ Thời Gian: ~10 phút

---

# 📖 HƯỚNG DẪN CHI TIẾT TEST MINT FUN MONEY

## Bước 1: Chuẩn Bị Tài Khoản Test

**Yêu cầu:**
- 1 tài khoản **User thường** (để tạo hoạt động ánh sáng)
- 1 tài khoản **Admin** có role admin trong DB (tài khoản của bé)
- Ví Attester `0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1` được import vào MetaMask
- Ví Attester có **tBNB** để trả gas

---

## Bước 2: Tạo Hoạt Động Ánh Sáng (User Flow)

1. Đăng nhập bằng tài khoản **User thường**
2. Thực hiện các hoạt động:
   - ✍️ Đăng bài viết mới (Post)
   - 💬 Bình luận (Comment)  
   - ❤️ Thả cảm xúc (Reaction)
3. **ANGEL AI** sẽ tự động đánh giá và cộng **Light Score**
4. Vào **Wallet** → Xem **Light Score Dashboard**

---

## Bước 3: Gửi Yêu Cầu Claim (User Flow)

1. Trong **Light Score Dashboard**, bé sẽ thấy:
   - Số FUN đang chờ claim
   - Nút **"Claim X FUN"**
2. Click nút **Claim**
3. Hệ thống tạo **Mint Request** với status `pending_sig`
4. User sẽ thấy thông báo: "Yêu cầu đã được gửi, đang chờ xử lý"

---

## Bước 4: Truy Cập Admin Panel (Admin Flow)

1. Đăng nhập bằng tài khoản **Admin**
2. Click vào nút **"🛡️ Admin Dashboard"** trong:
   - Desktop: Dropdown Menu (Avatar)
   - Mobile: Sidebar Menu
3. Chuyển đến trang `/admin`
4. Click tab **"⚡ PPLP Mint"**

---

## Bước 5: Connect Ví Attester (Admin Flow)

1. Trong tab PPLP Mint, click nút **"Kết nối Ví Attester"**
2. MetaMask popup → Chọn ví `0xe32d...94f1`
3. Approve connection
4. Xác nhận ví hiển thị đúng (có badge xanh)

---

## Bước 6: Ký Lệnh Mint (Attester Flow)

**Ký đơn lẻ:**
1. Tìm mint request trong danh sách "Chờ ký"
2. Click nút **"Ký"** bên cạnh request
3. MetaMask hiện popup **EIP-712 Signature Request**:
   ```
   Domain: FUNMoneyProductionV1_2_1 (v1.2.1)
   Message:
   - recipient: 0x...
   - amount: 5000000000000000000000
   - actionHash: 0x...
   - nonce: 42
   - deadline: 1707235200
   ```
4. Click **"Sign"** trong MetaMask
5. Request chuyển sang tab **"Đã ký"**

**Ký hàng loạt (Batch):**
1. Tick checkbox các request muốn ký
2. Click **"Ký hàng loạt (X)"**
3. MetaMask sẽ popup X lần (mỗi request 1 signature)

---

## Bước 7: Submit Lên Blockchain (Attester Flow)

1. Vào tab **"Đã ký"**
2. Click nút **"Submit"** bên cạnh request đã ký
3. MetaMask hiện popup **Transaction Request**:
   ```
   Contract: 0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2
   Function: lockWithPPLP
   Gas: ~150,000 - 300,000
   ```
4. Click **"Confirm"** trong MetaMask
5. Đợi transaction được mined (~3-5 giây trên BSC Testnet)
6. Request chuyển sang tab **"Đã gửi"** → **"Hoàn tất"**

---

## Bước 8: Kiểm Tra Kết Quả

**Trên Admin Panel:**
- Tab "Hoàn tất" hiển thị request với tx_hash
- Click **"BSCScan"** để xem transaction

**Trên BSCScan:**
```
https://testnet.bscscan.com/tx/0x...
```
- Status: Success ✅
- Function: lockWithPPLP
- Logs: Transfer event với amount

**Trên User Wallet:**
- User nhận được **97.03%** số FUN (LOCKED state)
- Ví dụ: Claim 1,000 FUN → User nhận 970.3 FUN

---

## 🔍 Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| "Không phải Attester" | Ví không đúng | Đổi sang ví `0xe32d...94f1` |
| Transaction failed | Hết deadline (1h) | Click "Thử lại" để tạo request mới |
| Nonce mismatch | Nonce đã được dùng | Refresh page và ký lại |
| Insufficient gas | Hết tBNB | Nạp thêm tBNB vào ví Attester |
| Signature invalid | Domain không khớp | Kiểm tra lại config EIP-712 |

---

## 📊 Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👤 User đăng bài/comment/reaction                              │
│         │                                                       │
│         ▼                                                       │
│  🤖 ANGEL AI đánh giá → Cộng Light Score                        │
│         │                                                       │
│         ▼                                                       │
│  💰 User vào Wallet → Click "Claim X FUN"                       │
│         │                                                       │
│         ▼                                                       │
│  📝 Tạo Mint Request (status: pending_sig)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🛡️ Admin vào Dashboard → Tab "⚡ PPLP Mint"                     │
│         │                                                       │
│         ▼                                                       │
│  🔗 Connect Wallet Attester (0xe32d...94f1)                     │
│         │                                                       │
│         ▼                                                       │
│  ✍️ Click "Ký" → MetaMask EIP-712 Signature                      │
│         │                                                       │
│         ▼                                                       │
│  📤 Click "Submit" → MetaMask Transaction                       │
│         │                                                       │
│         ▼                                                       │
│  ✅ Transaction confirmed → User nhận 97.03% FUN (LOCKED)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Checklist Test

- [ ] User tạo được Light Score qua post/comment/reaction
- [ ] User thấy số FUN pending trong Wallet
- [ ] User claim thành công → Tạo mint request
- [ ] Admin thấy request trong tab "Chờ ký"
- [ ] Admin connect được ví Attester
- [ ] Admin ký thành công → Request chuyển tab "Đã ký"
- [ ] Admin submit thành công → Có tx_hash
- [ ] Transaction hiện trên BSCScan
- [ ] User nhận được FUN trong ví (97.03%)

