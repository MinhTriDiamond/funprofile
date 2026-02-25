

# Hiển thị tên người dùng đã thả cảm xúc trên Feed

## Hiện trạng

Hệ thống **đã có** `ReactionViewerDialog` -- khi click vào số lượng cảm xúc (ví dụ "😊❤️ 2") sẽ mở dialog hiển thị danh sách user. Tuy nhiên, trải nghiệm hiện tại **không trực quan**: người dùng không biết có thể click vào đó, và không thấy ngay ai đã tương tác.

## Giải pháp: Thêm Tooltip hover hiển thị tên người dùng

Giống Facebook: khi rê chuột vào vùng reaction count ("😊❤️ 2"), hiển thị tooltip nhỏ liệt kê tên những người đã tương tác. Click vào vẫn mở dialog đầy đủ như cũ.

```text
  ┌──────────────────────┐
  │ Vũ Lê Quang          │  ← Tooltip hiện khi hover
  │ Nguyễn Văn A         │
  │ và 3 người khác...   │
  └──────────────────────┘
       😊❤️ 5              ← Vùng reaction count trên feed
```

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/feed/ReactionSummary.tsx` | Thêm HoverCard/Tooltip wrap quanh nút reaction count. Fetch danh sách user khi hover. Hiển thị tối đa 10 tên, nếu nhiều hơn thì ghi "và X người khác". |

## Chi tiết kỹ thuật

1. Wrap nút reaction count bằng `HoverCard` (đã có sẵn trong project từ radix-ui)
2. Khi hover trigger, fetch reactions kèm profiles (query tương tự `ReactionViewerDialog`)
3. Hiển thị danh sách tên trong `HoverCardContent`:
   - Emoji + tên hiển thị (full_name hoặc username)
   - Tối đa 10 người
   - Nếu totalCount > 10: hiển thị "và X người khác"
4. Click vẫn mở `ReactionViewerDialog` như cũ
5. Cache kết quả để không fetch lại mỗi lần hover

