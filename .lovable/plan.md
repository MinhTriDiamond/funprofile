
# 📋 Kế Hoạch: Sửa Lỗi Mint & Cải Tiến Tab PPLP Admin

## 🔍 Phân Tích Vấn Đề

### Vấn đề 1: User "Minh Trí 9999" Mint Fail
**Nguyên nhân đã xác định:**
```text
User: Minh Trí 9999 (id: dd9817a9-04db-4b91-928e-03b29ec77dec)
├── custodial_wallet_address: NULL ❌
├── external_wallet_address: NULL ❌
├── default_wallet_type: custodial
└── Kết quả: Edge function trả lỗi 400 "No wallet address configured"
```

User này **chưa thực sự kết nối ví** - có thể bé đã kết nối ở trang `/wallet` nhưng sau đó disconnect hoặc có lỗi khi lưu. Cả hai trường wallet đều vẫn là `NULL` trong database.

### Vấn đề 2: Dữ Liệu Trong Tab PPLP
6 mint requests là **DỮ LIỆU THỰC** từ database:
| User | Số FUN | Actions | Chi tiết |
|------|--------|---------|----------|
| @Đông Tôn | 15 FUN x2 | reaction | Thả cảm xúc trên bài viết |
| @huuxuan95x3o4t1 | 2,500 FUN | 10 posts | Tạo 10 bài viết (có dấu hiệu spam) |
| @huuxuan95x3o4t1 | 1,000 FUN x3 | 1 post mỗi cái | Claim nhiều lần cùng 1 bài |

**Lưu ý:** User @huuxuan đang claim cùng 1 action (post `ee445b49-...`) nhiều lần → Cần thêm anti-duplicate logic.

---

## 🎯 Giải Pháp Tổng Thể

### Phần A: Cải Thiện UX Khi Chưa Có Ví

**File:** `src/components/wallet/LightScoreDashboard.tsx`

Thay đổi:
1. Fetch thông tin wallet của user trước khi cho phép claim
2. Nếu chưa có ví → Hiển thị thông báo + nút "Thiết lập ví ngay"
3. Disable nút Claim và giải thích lý do

### Phần B: Click Username → Mở Profile Tab Mới

**File:** `src/components/admin/PplpMintTab.tsx`

Thay đổi dòng 394:
- Wrap username trong thẻ `<a>` với `target="_blank"`
- Sử dụng `request.user_id` để tạo link `/profile/{user_id}`
- Thêm hover effect và cursor pointer

### Phần C: Hiển Thị Chi Tiết Actions Trong Admin

**File:** `src/components/admin/PplpMintTab.tsx`

Thêm tính năng expandable row:
1. Click vào row → Expand hiển thị breakdown chi tiết
2. Hiển thị từng action type với số lượng và số FUN
3. Hiển thị content_preview của từng action
4. Cho phép Admin xem nhanh user đang claim từ hoạt động gì

**File:** `src/hooks/usePplpAdmin.ts`

Thêm function:
```text
fetchActionDetails(actionIds: string[]): Promise<ActionDetail[]>
```

### Phần D: Chống Duplicate Claim (Anti-Spam)

**File:** `supabase/functions/pplp-mint-fun/index.ts`

Thêm kiểm tra:
1. Kiểm tra `action_ids` đã tồn tại trong `pplp_mint_requests` khác chưa
2. Nếu đã claim → Reject với lỗi "Actions đã được claim trước đó"
3. Tránh user claim nhiều lần cùng 1 action

### Phần E: Thêm Tính Năng Quan Trọng Cho Tab PPLP

1. **Reject Request Button**: Cho phép Admin từ chối mint request với lý do
2. **Delete/Cleanup Button**: Xóa các request bị spam/duplicate
3. **View Action Details**: Xem chi tiết từng action trong request
4. **Filter by User**: Lọc request theo username
5. **Bulk Actions**: Reject/Delete hàng loạt

---

## 📁 Files Cần Thay Đổi

| File | Mục đích |
|------|----------|
| `src/components/wallet/LightScoreDashboard.tsx` | Kiểm tra wallet trước khi claim |
| `src/components/admin/PplpMintTab.tsx` | Click username, action details, reject button |
| `src/hooks/usePplpAdmin.ts` | Thêm fetchActionDetails, rejectRequest |
| `supabase/functions/pplp-mint-fun/index.ts` | Anti-duplicate check |

---

## 🔧 Chi Tiết Kỹ Thuật

### 1. LightScoreDashboard - Kiểm Tra Wallet

```text
Trước nút "Claim X FUN Money":
1. Kiểm tra hasWallet từ profile
2. Nếu không có:
   ┌─────────────────────────────────────────────────────┐
   │ ⚠️ Thiết lập ví để nhận FUN Money                   │
   │ Bạn cần kết nối ví Web3 để claim FUN Money.        │
   │                                                     │
   │ [🔗 Thiết lập ví ngay] ← Chuyển đến /wallet        │
   └─────────────────────────────────────────────────────┘
```

### 2. PplpMintTab - Username Clickable

```text
Trước:
<div className="font-medium">@{request.profiles?.username}</div>

Sau:
<a
  href={`/profile/${request.user_id}`}
  target="_blank"
  rel="noopener noreferrer"
  className="font-medium text-primary hover:underline"
  onClick={(e) => e.stopPropagation()}
>
  @{request.profiles?.username}
</a>
```

### 3. Action Details Expandable

```text
Interface mới:
interface ActionDetail {
  id: string;
  action_type: string;
  content_preview: string | null;
  mint_amount: number;
  created_at: string;
}

UI khi expand:
┌────────────────────────────────────────────────────────────────┐
│ 📊 Chi tiết Actions:                                           │
│ ├─ 📝 Tạo bài viết (10 actions) = 2,500 FUN                   │
│ │   └─ "LÌ XÌ TẾT 26.000.000.000 VNĐ..." (+250 FUN)          │
│ │   └─ "🔥 Con là ánh sáng yêu thương..." (+250 FUN)         │
│ │   └─ ... 8 more                                              │
│ └─ ❤️ Cảm xúc (0 actions)                                      │
└────────────────────────────────────────────────────────────────┘
```

### 4. Anti-Duplicate Check (Edge Function)

```text
// Trong pplp-mint-fun/index.ts
const { data: existingRequests } = await supabase
  .from('pplp_mint_requests')
  .select('id, action_ids')
  .contains('action_ids', action_ids)
  .not('status', 'eq', 'failed');

if (existingRequests && existingRequests.length > 0) {
  return Response.json({ error: 'Một số actions đã được claim trước đó' }, 400);
}
```

### 5. Reject Request Function

```text
// Trong usePplpAdmin.ts
const rejectRequest = async (requestId: string, reason: string) => {
  await supabase
    .from('pplp_mint_requests')
    .update({
      status: 'rejected',
      error_message: reason,
    })
    .eq('id', requestId);
  
  // Reset light_actions về approved để user có thể claim lại
  // Hoặc set về rejected nếu là spam
};
```

---

## 🎨 UI Mockup - Cải Tiến Tab PPLP

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ⚡ PPLP On-Chain Mint                                     [🔄 Refresh]    │
├────────────────────────────────────────────────────────────────────────────┤
│ Chờ ký (6) │ Đã ký (0) │ Đã gửi (0) │ Hoàn tất (0) │ Thất bại (0)         │
├────────────────────────────────────────────────────────────────────────────┤
│ ☐ Chọn tất cả (2 đã chọn)                    [Ký hàng loạt] [❌ Từ chối]  │
├────────────────────────────────────────────────────────────────────────────┤
│ ☑ 👤 @huuxuan95x3o4t1 ← Click mở profile    2,500 FUN   ⏳ Chờ ký       │
│   0xa6b576...22e2f7                         10 actions   3h ago  [▼] [✍]│
│   ├────────────────────────────────────────────────────────────────────  │
│   │ 📊 Chi tiết:                                                         │
│   │ 📝 Post: 10 actions = 2,500 FUN                                     │
│   │   • "LÌ XÌ TẾT 26.000..." (+250 FUN) - 3h ago                       │
│   │   • "🔥 Con là ánh sáng..." (+250 FUN) - 4h ago                     │
│   │   • ... 8 more                                                       │
│   └────────────────────────────────────────────────────────────────────  │
├────────────────────────────────────────────────────────────────────────────┤
│ ☐ 👤 @Đông Tôn ← Click mở profile           15 FUN      ⏳ Chờ ký        │
│   0x8661b8...a2ca6                          1 actions   1h ago   [▼] [✍]│
└────────────────────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Timeline

| Phase | Task | Thời gian |
|-------|------|-----------|
| 1 | Thêm wallet check trong LightScoreDashboard | 5 phút |
| 2 | Click username mở profile tab mới | 3 phút |
| 3 | Thêm fetchActionDetails trong usePplpAdmin | 5 phút |
| 4 | Thêm expandable row với action breakdown | 10 phút |
| 5 | Thêm anti-duplicate check trong edge function | 5 phút |
| 6 | Thêm Reject button trong PplpMintTab | 5 phút |
| **Tổng** | | **~33 phút** |

---

## ✅ Kết Quả Mong Đợi

| Vấn đề | Giải pháp |
|--------|-----------|
| User chưa có ví → Lỗi không rõ | Hiển thị hướng dẫn thiết lập ví |
| Không biết user claim từ action gì | Expandable row hiển thị chi tiết |
| Phải copy username để tìm profile | Click username → Mở profile tab mới |
| User spam claim cùng action nhiều lần | Anti-duplicate check trong edge function |
| Admin không thể từ chối request | Thêm Reject button với lý do |

---

## 🔐 Về User "Minh Trí 9999"

User này **chưa thực sự có ví trong database**. Bé cần:
1. Vào trang `/wallet`
2. Kết nối ví MetaMask/Trust/v.v.
3. Ký message để xác thực
4. Sau đó mới có thể claim FUN Money

Sau khi implement, UI sẽ hiển thị rõ ràng hướng dẫn này thay vì lỗi mơ hồ.
