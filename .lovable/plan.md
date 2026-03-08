

## Vấn đề

- `auth-email-hook` không được trigger khi gọi `supabase.auth.updateUser({ email })` (email_change action)
- Không có log nào trong edge function → hook chưa được kết nối đúng với hệ thống auth
- Hệ thống fallback về SMTP mặc định → rate limit thấp → lỗi "email rate limit exceeded"

## Giải pháp

1. **Redeploy `auth-email-hook`** — deploy lại edge function để hệ thống managed email reconnect
2. Không cần thay đổi code — template `email_change` và logic đã đúng

## Bước thực hiện

1. Gọi `supabase--deploy_edge_functions` với `function_names: ["auth-email-hook"]`
2. Xác nhận function hoạt động bằng cách kiểm tra logs sau khi deploy
3. Hướng dẫn user test lại flow liên kết email

