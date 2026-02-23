
# Fix: Nút Sắp Xếp A-Z Không Hoạt Động

## Nguyên Nhân

Khi không có bộ lọc hoặc tìm kiếm nào đang hoạt động, biến `result` vẫn trỏ trực tiếp đến mảng `allUsers` gốc. Khi gọi `.sort()`, nó thay đổi mảng tại chỗ nhưng trả về cùng một tham chiếu (reference). React so sánh tham chiếu và thấy "không thay đổi" nên không render lại giao diện.

## Cách Sửa

**File: `src/hooks/useUserDirectory.ts`** (1 dòng thay đổi)

Tạo bản sao mảng trước khi sắp xếp để React nhận ra dữ liệu đã thay đổi:

```typescript
// Trước dòng sort, thêm:
if (sortBy !== 'default') result = [...result];
```

Chỉ cần thêm 1 dòng duy nhất, không thay đổi logic khác.
