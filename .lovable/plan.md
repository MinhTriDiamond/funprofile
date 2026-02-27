

# Fix Scroll + Thêm Thống Kê cho AttesterSigningPanel

## Vấn đề
- ScrollArea có `max-h-[500px]` nhưng không cuộn được vì thiếu `overflow-hidden` trên container và cần set chiều cao cố định thay vì max-height
- Chưa có thông tin tổng hợp (tổng FUN, số request đã ký/chờ ký)

## Thay đổi

### AttesterSigningPanel.tsx

**1. Fix thanh cuộn**: Thay `max-h-[500px]` bằng `h-[500px]` trên ScrollArea để đảm bảo thanh cuộn hoạt động. Khi danh sách ngắn hơn 500px thì nội dung hiển thị bình thường, khi dài hơn thì cuộn được.

**2. Thêm bảng thống kê** phía trên danh sách request:
- Tổng số request
- Số request cần ký / đã ký
- Tổng FUN chờ ký
- Tổng FUN đã ký

Hiển thị dạng grid nhỏ gọn với các con số nổi bật.

### Kỹ thuật
- 1 file thay đổi: `src/components/wallet/AttesterSigningPanel.tsx`
- Tính toán thống kê từ mảng `requests` đã có sẵn trong props
- Giữ nguyên toàn bộ logic ký và UI card hiện tại
