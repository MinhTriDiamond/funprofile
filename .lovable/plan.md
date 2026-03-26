

## Fix: Header bảng bị chữ đè khi cuộn

### Nguyên nhân
Thanh header bảng (`thead`) có `sticky top-0` nhưng nền chỉ là `bg-muted/50` (nửa trong suốt) — khi cuộn xuống, nội dung bên dưới hiện xuyên qua header.

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. Đổi `bg-muted/50` thành `bg-background` trên `<thead>` — nền hoàn toàn đục, che phủ nội dung khi cuộn
2. Thêm `shadow-[0_1px_0_0_hsl(var(--border))]` để tạo đường viền dưới header khi cuộn (giống bảng ContentStatsModal)

### Kết quả
Khi cuộn bảng xuống, header cố định phía trên với nền đục, không bị chữ đè lên.

