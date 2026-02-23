
# Kích Hoạt Điều Hướng Đến Hồ Sơ Khi Bấm Tên Người Dùng Trong Chat

## Vấn đề

Hiện tại, tên người dùng ("Hoàng Thị Thùy") và avatar trong phần header của trang chat chỉ là text/hình tĩnh, không thể bấm vào được. Người dùng muốn bấm vào tên hoặc avatar để xem hồ sơ cá nhân của người đó.

## Giải pháp

Biến tên và avatar trong header chat thành link có thể bấm, điều hướng đến trang hồ sơ cá nhân `/profile/{userId}` của người đối thoại.

## Chi tiết kỹ thuật

### File cần sửa: `src/modules/chat/components/MessageThread.tsx`

**Thay đổi tại vùng Header (dòng ~406-422):**

1. Wrap Avatar + tên người dùng trong một thẻ có `onClick` + `cursor-pointer`
2. Khi là chat 1-1 (không phải group): bấm vào avatar hoặc tên sẽ gọi `navigate(/profile/{otherUserId})`
3. Khi là group chat: bấm vào avatar/tên sẽ mở Group Settings (hành vi hiện tại)
4. Thêm hiệu ứng hover (`hover:underline`, `hover:ring`) để người dùng biết có thể bấm

Cụ thể:
- Avatar: thêm `className="cursor-pointer hover:ring-2 hover:ring-primary"` và `onClick` điều hướng
- Tên: đổi từ `<p>` sang `<button>` hoặc thêm `onClick` + `cursor-pointer hover:underline`
- Chỉ kích hoạt khi `dmOtherUserId` tồn tại (chat 1-1) hoặc khi là group thì mở settings

Không tạo file mới, chỉ sửa 1 file duy nhất.
