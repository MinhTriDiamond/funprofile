
Mục tiêu: sửa triệt để 3 link Angel AI, Facebook, Zalo để icon vòng orbit hiển thị đúng ảnh đại diện (hoặc fallback rõ ràng khi nền tảng không cho lấy tự động).

1) Kết quả kiểm tra hiện tại (nguyên nhân gốc)
- Facebook: ảnh đang bị lỗi do 2 điểm:
  - URL cũ lưu trong `social_links.avatarUrl` có `&amp;` thay vì `&` (URL hỏng).
  - Proxy ảnh trong `fetch-link-preview` chặn redirect Facebook (`graph.facebook.com` thường trả 302), nên ảnh bị 404.
- Angel AI:
  - Nhánh internal link mới chỉ chắc cho dạng `/username`; chưa phủ đủ các dạng path (đặc biệt `/user/{id}` hoặc biến thể khác), nên có lúc rơi về ảnh OG không đúng avatar người dùng.
- Zalo:
  - `zalo.me/{phone}` thường trả trang đăng nhập QR, không có `og:image` avatar => hiện backend trả `avatarUrl: null` (đây là hạn chế nguồn dữ liệu, không phải lỗi render).

2) Kế hoạch chỉnh backend function `fetch-link-preview`
- Chuẩn hoá URL avatar trước khi dùng:
  - decode HTML entities (`&amp;` -> `&`) cho mọi URL ảnh.
- Sửa proxy ảnh Facebook:
  - Cho phép follow redirect với `graph.facebook.com` (không chặn 3xx cứng như hiện tại).
  - Chỉ reject khi response cuối không phải `image/*`.
- Tăng độ chính xác cho Angel internal:
  - Parse thêm pattern `/user/{uuid}` để lookup theo `id`.
  - Giữ lookup theo `username` cho dạng `/username`.
  - Fallback cuối mới dùng OG scrape.
- Zalo:
  - Giữ auto-scrape (mobile UA) nhưng nếu không có avatar thì trả trạng thái rõ ràng `avatarUnavailable: true` để frontend xử lý fallback chủ động.

3) Kế hoạch chỉnh frontend `AvatarOrbit`
- Sanitizer trước khi render:
  - Chuẩn hoá mọi `avatarUrl` (decode `&amp;`) trước khi set `src`.
- Bổ sung điều kiện “stale avatar” để tự refetch:
  - Facebook URL chứa `&amp;`, `graph.facebook.com`, hoặc mẫu fallback cũ => ép gọi lại function.
  - Angel URL không match avatar hợp lệ => ép gọi lại.
- Fallback UX cho Zalo (khi backend báo unavailable):
  - Chủ profile có thể nhập URL ảnh đại diện thủ công cho link đó ngay trong popup chỉnh link.
  - Lưu vào `social_links.avatarUrl` để hiển thị ổn định về sau.

4) Backfill dữ liệu cũ (không đổi schema)
- Khi owner mở trang profile:
  - auto-normalize URL avatar cũ (`&amp;`), refetch lại các link Facebook/Angel/Zalo đang lỗi.
  - nếu có thay đổi thì cập nhật lại `social_links` trong hồ sơ.

5) Kiểm thử sau khi làm
- Test trực tiếp 3 URL người dùng đang dùng:
  - Angel AI: phải ra ảnh avatar hợp lệ (không phải favicon mặc định).
  - Facebook: phải load được ảnh sau proxy (không 404, không `&amp;`).
  - Zalo: nếu không lấy tự động được thì hiển thị fallback + cho nhập avatar thủ công.
- Reload trang profile để xác nhận dữ liệu đã được “healed” và giữ bền sau refresh.
