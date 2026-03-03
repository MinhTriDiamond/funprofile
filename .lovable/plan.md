

# Sửa From name email: "FUN Profile" → "FUN Ecosystem"

## Phân tích

Code trong `auth-email-hook/index.ts` đã đúng:
- `SITE_NAME = "FUN Ecosystem"` (dòng 38)
- `from: \`${SITE_NAME} <noreply@${FROM_DOMAIN}>\`` (dòng 254)

Tuy nhiên screenshot cho thấy "FUN Profile" — nghĩa là edge function cần được **deploy lại** để cập nhật phiên bản mới nhất.

## Hành động

1. **Deploy lại** edge function `auth-email-hook` — không cần sửa code vì nội dung đã đúng
2. Xác nhận email preview hiển thị "FUN Ecosystem" sau khi deploy

Không cần thay đổi file nào.

