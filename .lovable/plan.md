

# Thêm biến `VITE_RECORDING_CHUNKED=true`

## Lưu ý quan trọng

File `.env` trong project này được **quản lý tự động** bởi Lovable Cloud và **không thể chỉnh sửa trực tiếp**. Mọi thay đổi thủ công sẽ bị ghi đè.

## Giải pháp

Thay vì phụ thuộc vào biến `.env`, ta sẽ **hardcode feature flag** trực tiếp trong code, tại nơi nó được đọc — file `src/modules/live/pages/LiveHostPage.tsx`.

Cách làm: Tìm chỗ đọc `import.meta.env.VITE_RECORDING_CHUNKED` và thay bằng giá trị `true` (hoặc thêm fallback `|| true`).

Như vậy feature chunked recording sẽ luôn bật mà không cần sửa `.env`.

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/modules/live/pages/LiveHostPage.tsx` | Đặt `VITE_RECORDING_CHUNKED` mặc định là `true` |

