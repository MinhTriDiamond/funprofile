

# Thêm Tìm Kiếm & Lọc cho "Top Users Chờ Claim"

## Tính Năng Mới

Thêm thanh tìm kiếm và bộ lọc trạng thái ví ngay phía trên bảng danh sách users, giúp Admin nhanh chóng tìm user theo tên hoặc lọc theo trạng thái ví.

## Thay Đổi

### File: `src/components/admin/PplpMintTab.tsx`

1. **Thêm state mới** cho ô tìm kiếm (`searchQuery`) và bộ lọc trạng thái ví (`walletFilter`: all / primary / legacy / none)

2. **Thêm thanh công cụ** phía trên bảng, gồm:
   - Input tìm kiếm theo username (có icon Search, debounce nhanh)
   - 4 nút lọc trạng thái ví: "Tất cả", "Co vi chinh thuc" (xanh), "Vi cu" (vang), "Chua co vi" (do)
   - Hiển thị số lượng kết quả sau khi lọc

3. **Logic lọc danh sách** - filter `ecosystemStats.top_users` theo:
   - Username chứa từ khóa tìm kiếm (case-insensitive)
   - Trạng thái ví khớp với bộ lọc đã chọn

### Chi Tiet Ky Thuat

```text
+--------------------------------------------------+
| [Search icon] Tim kiem user...                   |
| [Tat ca (199)] [Co vi (179)] [Vi cu (X)] [Chua (Y)]|
+--------------------------------------------------+
| # | User | Dia chi vi | FUN | Actions | Vi       |
|---|------|------------|-----|---------|----------|
| 1 | ...  | 0x12...78  | 500 | 4       | Green    |
| 2 | ...  | 0xab...cd  | 300 | 2       | Yellow   |
+--------------------------------------------------+
```

- Thanh tim kiem su dung Input component co san
- Bo loc su dung cac Button variant="outline" voi mau tuong ung
- So luong ket qua cap nhat real-time khi go
- Khong can thay doi database hay hook - chi thay doi UI filtering

