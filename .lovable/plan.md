
# 🔧 Kế Hoạch Sửa Lỗi: Liên Kết Ví Vào Database

## 📋 Nguyên Nhân Đã Xác Định

### Vấn đề chính:
Khi user **đăng nhập bằng Wallet Login**, hệ thống tự động tạo một tài khoản mới với địa chỉ ví đó. Sau đó, nếu user đăng nhập bằng **email/phone** (tài khoản khác) và cố liên kết **cùng ví đó** → Hệ thống từ chối vì ví đã thuộc account khác.

### Dữ liệu từ database:

| User cố liên kết | Ví muốn liên kết | Vấn đề |
|------------------|------------------|--------|
| Minh Trí 9999 | `0xe3e97a95...65c5` | Ví đã thuộc về account `wallet_e3e97a95mado` |
| Minh Trí | `0x847b5b6c...62e0` | Ví đã thuộc về account `wallet_847b5b6cnmjq` |

### Logs Edge Function:
```
WARNING [CONNECT-WALLET] Wallet already connected to another account
```

---

## 🎯 Giải Pháp

### Phần 1: Cải thiện thông báo lỗi (Ưu tiên cao)

**File:** `src/components/wallet/WalletCenterContainer.tsx`

Trong function `linkWalletToProfile`, khi nhận lỗi "already connected":
- Hiển thị thông báo chi tiết hơn
- Gợi ý user sử dụng Wallet Login hoặc ví khác

```text
Trước:
toast.error('Ví này đã được liên kết với tài khoản khác');

Sau:
toast.error('Ví này đã được dùng để đăng nhập. Hãy sử dụng Wallet Login hoặc chọn ví khác.', {
  duration: 6000,
  action: {
    label: 'Wallet Login',
    onClick: () => navigate('/auth')
  }
});
```

### Phần 2: Cải thiện Edge Function error response

**File:** `supabase/functions/connect-external-wallet/index.ts`

Trả về thông tin chi tiết hơn khi ví đã thuộc account khác:
- Cho biết ví đã được dùng để đăng nhập
- Gợi ý sử dụng Wallet Login

### Phần 3: Thêm nút "Wallet Login" trong wallet page

**File:** `src/components/wallet/WalletCenterContainer.tsx`

Khi phát hiện lỗi "already connected", hiển thị:
- Alert box với thông tin chi tiết
- Nút "Đăng nhập bằng ví này" → Navigate tới /auth với mode wallet login

### Phần 4: (Tương lai) Tính năng Merge Accounts

Cho phép user merge 2 accounts nếu cùng sở hữu ví:
1. Phát hiện ví đã thuộc account khác
2. Hiển thị dialog: "Ví này đã được dùng để tạo tài khoản @wallet_xxx. Bạn có muốn gộp 2 tài khoản?"
3. Nếu đồng ý:
   - Yêu cầu ký message xác nhận
   - Chuyển tất cả data (posts, comments, friends, rewards) từ wallet_xxx sang account chính
   - Vô hiệu hóa account wallet_xxx
4. Liên kết ví với account chính

---

## 📁 Files Cần Sửa

| File | Thay đổi |
|------|----------|
| `src/components/wallet/WalletCenterContainer.tsx` | Cải thiện error handling và thông báo |
| `supabase/functions/connect-external-wallet/index.ts` | Trả về error message chi tiết hơn |

---

## 📝 Chi Tiết Thay Đổi

### 1. WalletCenterContainer.tsx - Cải thiện error handling

```text
// Trong linkWalletToProfile function, phần catch:

} catch (err: any) {
  console.error('[WalletCenter] Link wallet error:', err);
  
  if (err?.message?.includes('rejected') || err?.name === 'UserRejectedRequestError') {
    toast.error('Bạn đã từ chối ký xác nhận');
  } else if (err?.message?.includes('already connected')) {
    // Hiển thị thông báo chi tiết hơn
    toast.error(
      'Ví này đã được dùng để đăng nhập trước đó. Vui lòng sử dụng Wallet Login hoặc chọn ví khác.',
      {
        duration: 8000,
        description: 'Bạn có thể Disconnect ví hiện tại và chọn ví khác, hoặc đăng nhập lại bằng ví này.',
      }
    );
  } else {
    toast.error(err?.message || 'Không thể liên kết ví');
  }
} finally {
  setIsLinkingWallet(false);
}
```

### 2. connect-external-wallet Edge Function - Cải thiện error response

```text
// Dòng 87-92, thay đổi error message:

if (existingProfile) {
  console.warn('[CONNECT-WALLET] Wallet already connected to another account');
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Wallet already connected to another account',
      error_code: 'WALLET_ALREADY_LINKED',
      suggestion: 'Vui lòng sử dụng Wallet Login để đăng nhập vào tài khoản đã liên kết với ví này, hoặc sử dụng ví khác.'
    }),
    { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## ⏱️ Timeline

| Task | Thời gian |
|------|-----------|
| Cải thiện error handling trong WalletCenterContainer | 5 phút |
| Cải thiện edge function response | 5 phút |
| Testing | 5 phút |
| **Tổng** | **~15 phút** |

---

## ✅ Kết Quả Mong Đợi

| Trước | Sau |
|-------|-----|
| Thông báo lỗi ngắn, không rõ ràng | Thông báo chi tiết + gợi ý giải pháp |
| User không biết phải làm gì | Có hướng dẫn cụ thể: Wallet Login hoặc ví khác |
| Toast tự ẩn nhanh | Toast hiển thị lâu hơn (8 giây) |

---

## 💡 Lưu Ý Cho User

Với các user đã gặp lỗi này (Minh Trí 9999, Minh Trí), có 2 cách giải quyết:

**Cách 1: Sử dụng Wallet Login**
- Đăng xuất khỏi account hiện tại
- Vào trang Auth, chọn "Wallet Login"
- Kết nối ví → Đăng nhập vào account wallet_xxx

**Cách 2: Sử dụng ví khác**
- Trong MetaMask, tạo hoặc import ví mới
- Kết nối ví mới đó với account Minh Trí 9999

**Cách 3: (Admin) Xóa account wallet_xxx**
- Admin có thể xóa account wallet_e3e97a95mado
- Sau đó user Minh Trí 9999 có thể link ví bình thường
