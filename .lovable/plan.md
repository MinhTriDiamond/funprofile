

# Sửa lỗi auth-email-hook và From name

## Vấn đề

1. **Email preview lỗi "Failed to build preview"**: Edge function trả về 401 (Unauthorized) khi Cloud gọi endpoint `/preview`. Có thể do phiên bản deployed bị cũ hoặc `LOVABLE_API_KEY` không khớp giữa code deployed và secret hiện tại.

2. **From name "FUN Profile"**: Mặc dù code đã có `SITE_NAME = "FUN Ecosystem"`, Cloud UI vẫn hiển thị "FUN Profile" — nghĩa là phiên bản deployed chưa phải phiên bản mới nhất.

## Giải pháp

Cả hai vấn đề đều giải quyết bằng **redeploy edge function `auth-email-hook`**:

1. Redeploy `auth-email-hook` để đồng bộ code mới nhất (đã có `SITE_NAME = "FUN Ecosystem"`) với môi trường production
2. Sau khi deploy, Cloud preview sẽ có thể render email template thành công
3. From name sẽ hiển thị "FUN Ecosystem" thay vì "FUN Profile"

Không cần thay đổi code — chỉ cần deploy lại.

