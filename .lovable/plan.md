

## Kế hoạch: Xóa 2 giao dịch trùng lặp (placeholder)

### Vấn đề
2 donation records có tx_hash giả (`_placeholder`) khiến BSCScan báo lỗi khi nhấp vào.

### Thực hiện
**Database migration** - Xóa 2 bản ghi trùng:
```sql
DELETE FROM donations 
WHERE id IN (
  '14fe5422-8f91-4a2f-a6c5-1628d7a1f1be',
  '39e31ff5-cb44-4c4b-bb25-60bf090380d5'
);
```

Cũng xóa posts gift_celebration tương ứng nếu có (cần kiểm tra).

### Kết quả
- FATHER → angelbachviet sẽ chỉ còn 2 lệnh thật (97 USDT + 9,797,979 CAMLY)
- Không cần thay đổi code frontend

