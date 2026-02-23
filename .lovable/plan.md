
# Thông Báo Kết Thúc Phiên Live Stream

## Vấn đề hiện tại

Khi host kết thúc phiên live, video chỉ hiển thị text "This live has ended." hoặc "Host đã rời phiên live" trên nền đen. Không có hộp thoại (dialog) thông báo rõ ràng cho người xem, và người xem phải tự bấm nút "Back" để quay về.

## Giải pháp

Thêm một hộp thoại (AlertDialog) hiển thị khi phiên live chuyển sang trạng thái "ended":
- Tiêu đề: "Phiên Live Stream đã kết thúc"
- Nội dung: Thông báo cảm ơn người xem
- Nút "OK": Tự động navigate về trang Feed (`/`)
- Dialog không cho phép đóng bằng cách click bên ngoài (người dùng phải bấm OK)

## Thay đổi chi tiết

### File: `src/modules/live/pages/LiveAudiencePage.tsx`

1. **Thêm import** `AlertDialog` từ `@/components/ui/alert-dialog`
2. **Thêm state** `showEndedDialog` -- bật `true` khi `session.status` chuyển sang `'ended'`
3. **Thêm useEffect** theo dõi `session.status === 'ended'` để set `showEndedDialog = true`
4. **Thêm AlertDialog** vào cuối component:
   - Không có nút cancel, chỉ có nút "OK"
   - Khi bấm OK: `navigate('/')`
   - Thay text "This live has ended." trên video thành "Phiên Live Stream đã kết thúc"

### Giao dien dialog

```text
+-----------------------------------+
|                                   |
|   Phien Live Stream da ket thuc   |
|                                   |
|   Cam on ban da theo doi phien    |
|   phat truc tiep!                 |
|                                   |
|              [ OK ]               |
|                                   |
+-----------------------------------+
```
