

## Hiển thị đầy đủ các cột và thanh trượt ngang dưới tiêu đề

### Vấn đề
Bảng hiện tại bị cắt nội dung các cột (Họ tên, Email, Ví...) vì chiều rộng dialog không đủ. Thanh cuộn ngang không xuất hiện vì bảng co lại theo container.

### Giải pháp
**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Thêm `min-w-max`** cho thẻ `<table>` (dòng 263) để bảng giữ nguyên chiều rộng tự nhiên, không bị co lại:
   ```
   <table className="min-w-max w-full text-sm">
   ```

2. **Bỏ `truncate` và `max-w-[...]`** ở các cột username (dòng 295), email (dòng 300), họ tên (dòng 301) để nội dung hiển thị đầy đủ, thêm `whitespace-nowrap` để không bị xuống dòng.

3. **Thêm `z-10`** cho `<thead>` sticky (dòng 264) để header luôn nằm trên khi cuộn dọc:
   ```
   <thead className="bg-muted/50 sticky top-0 z-10">
   ```

### Kết quả
- Tất cả cột hiển thị đầy đủ nội dung
- Thanh trượt ngang xuất hiện bên dưới hàng tiêu đề khi bảng rộng hơn dialog
- Header cố định khi cuộn dọc

