
Mục tiêu: xử lý triệt để lỗi “đổi tab rồi app tự về trang chủ”, đồng thời giữ đúng yêu cầu “chỉ reload khi có bản publish mới và người dùng bấm cập nhật”.

1) Khoanh nguyên nhân chính (đã xác nhận từ code hiện tại)
- `UpdateNotification` đã không còn auto-reload theo route.
- Lỗi còn lại nhiều khả năng đến từ luồng auth khi quay lại tab:
  - `AuthSessionKeeper` gọi refresh khi tab visible sau thời gian ẩn.
  - Có thể phát sinh event auth thoáng qua kiểu `SIGNED_OUT`.
  - `LawOfLightGuard` + `useCurrentUser` đang phản ứng mạnh với `SIGNED_OUT` và đẩy sang `/auth`.
  - `Auth.tsx` thấy session còn thì lại điều hướng về `/` ⇒ nhìn như “tự load về trang chủ”.

2) Sửa chống “false sign-out” trong `src/components/auth/LawOfLightGuard.tsx`
- Mở rộng nhánh “khôi phục phiên hợp lệ” cho các event: `SIGNED_IN`, `TOKEN_REFRESHED`, `INITIAL_SESSION`, `USER_UPDATED`:
  - luôn hủy `signOutTimerRef` nếu đang chờ redirect.
  - cập nhật cờ `wasAuthenticatedRef` phù hợp.
- Với `SIGNED_OUT`:
  - giữ debounce, nhưng trước khi `navigate('/auth')` phải `getSession()` kiểm tra lần cuối.
  - chỉ redirect khi session thực sự null.

3) Sửa xử lý auth cache trong `src/hooks/useCurrentUser.ts`
- Không set user=null ngay lập tức khi nhận `SIGNED_OUT`.
- Dùng “delayed sign-out verification”:
  - chờ ngắn (ví dụ 800–1500ms), gọi `getSession()` để xác nhận.
  - nếu session đã hồi phục thì hủy clear cache.
- Nếu nhận event có session hợp lệ trong lúc chờ (`TOKEN_REFRESHED`/`INITIAL_SESSION`/`SIGNED_IN`/`USER_UPDATED`) thì hủy pending sign-out.

4) Giảm nhiễu refresh ở `src/App.tsx` (AuthSessionKeeper)
- Giữ cơ chế refresh khi quay lại tab, nhưng chỉ chạy khi cần:
  - có session thật.
  - token gần hết hạn (ví dụ còn <5 phút) mới refresh.
- Tránh refresh “mọi lần visible sau 30s” để giảm xác suất phát sinh chuỗi event auth không ổn định.

5) Kịch bản kiểm thử E2E sau khi sửa
- Test khi đang ở `/wallet`:
  - ẩn tab 10s, 35s, 2 phút rồi quay lại.
  - xác nhận vẫn ở đúng route cũ, không bật về `/` hoặc `/auth`.
- Test ở `/profile`, `/chat` tương tự để đảm bảo không lỗi cục bộ.
- Test cơ chế cập nhật phiên bản:
  - không publish: không tự reload.
  - có publish: chỉ hiện toast cập nhật; chỉ reload khi bấm nút “Cập nhật”.

Chi tiết kỹ thuật
- Files dự kiến cập nhật:
  - `src/components/auth/LawOfLightGuard.tsx`
  - `src/hooks/useCurrentUser.ts`
  - `src/App.tsx` (khối `AuthSessionKeeper`)
- Không thay đổi DB/RLS.
- Không thay đổi lại `useVersionCheck`/`UpdateNotification` ngoài phạm vi cần thiết.
