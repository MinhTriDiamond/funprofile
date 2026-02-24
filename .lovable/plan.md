

# Cập nhật thông báo lỗi ví chưa kết nối

## Vấn đề hiện tại
Khi user đăng nhập bằng ví mà ví chưa được liên kết với tài khoản nào, hệ thống trả lỗi 403 với thông báo chung chung "đăng ký tài khoản trước". Cần phân biệt rõ hơn: nếu user đã có tài khoản nhưng chưa dán ví, cần nhắc họ vào trang cá nhân kết nối ví.

## Giải pháp
Cập nhật thông báo lỗi ở cả backend và frontend để hướng dẫn rõ ràng hơn, bao gồm cả trường hợp user đã có tài khoản nhưng chưa kết nối ví.

---

## Chi tiết kỹ thuật

### File 1: `supabase/functions/sso-web3-auth/index.ts`
- **Dòng 169-178**: Cập nhật message trong response lỗi WALLET_NOT_REGISTERED thành:
  - "Ví này chưa được kết nối với tài khoản nào. Nếu bạn đã có tài khoản, hãy đăng nhập bằng email/Google và kết nối ví trong trang cá nhân. Nếu chưa có tài khoản, hãy đăng ký mới và dán mã ví khi đăng ký."

### File 2: `src/components/auth/WalletLoginContent.tsx`
- **Dòng 106-107**: Cập nhật toast error cho trường hợp WALLET_NOT_REGISTERED:
  - Thay message hiện tại bằng: "Ví chưa được kết nối! Nếu đã có tài khoản, hãy đăng nhập và kết nối ví trong trang cá nhân. Nếu chưa, hãy đăng ký tài khoản mới."
  - Tăng duration lên 8000ms để user đọc kịp

### Tac dong
- 2 file sửa (1 edge function, 1 frontend)
- Chỉ thay đổi nội dung thông báo, không thay đổi logic
- User được hướng dẫn rõ ràng hơn trong cả 2 trường hợp

