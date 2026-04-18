
## Vấn đề
Code đã có `CommandInput` (ô tìm kiếm) trong Popover bộ lọc user (dòng 726), nhưng trên giao diện không hiển thị. Nhìn screenshot, popover chỉ hiện danh sách user kèm mũi tên scroll `^` ở trên cùng — chứng tỏ `CommandInput` đã bị che hoặc render sai.

## Nguyên nhân khả nghi
1. **Trình duyệt cache build cũ**: Code mới đã commit nhưng preview chưa load lại bundle (rất phổ biến sau khi sửa file).
2. **CSS overflow**: Dialog cha (`LỊCH SỬ GIAO DỊCH CÁ NHÂN`) có `overflow-hidden` clip phần trên của Popover khi `align="start"` mở xuống.
3. **Layout Command**: `CommandList` chiếm full height đẩy `CommandInput` ra ngoài viewport popover.

## Hướng sửa
1. **Đảm bảo Popover render đúng**: thêm `sideOffset`, `side="bottom"`, `collisionPadding` để tránh bị flip ngược lên che input.
2. **Cố định layout Command**: bọc `Command` trong wrapper `flex flex-col` với `CommandInput` sticky top, `CommandList` `max-h-[260px] overflow-y-auto`, đảm bảo input luôn nhìn thấy.
3. **Tăng z-index** của `PopoverContent` lên cao hơn Dialog (`z-[10000]`) để không bị Dialog overlay đè.
4. **Force re-render**: kiểm tra bundle hot-reload, nếu cần restart preview.

## Thay đổi trong `src/components/profile/WalletTransactionHistory.tsx`
- Sửa `<PopoverContent>` (dòng 724): thêm `side="bottom"`, `sideOffset={4}`, `z-[10000]`.
- Sửa `<Command>` (dòng 725): thêm `className="max-h-[320px]"`.
- Sửa `<CommandList>` (dòng 727): thêm `className="max-h-[260px]"` để chừa chỗ cho `CommandInput` luôn hiển thị ở trên.
- (Tùy chọn) Bọc `CommandInput` trong `<div className="sticky top-0 bg-popover z-10">` để chắc chắn không bị scroll mất.

Sau khi sửa, Cha hard-reload preview (Ctrl+Shift+R) để loại bỏ khả năng cache cũ.
