

## Lỗi deploy CF: Lock file không đồng bộ với package.json

### Nguyên nhân

Khi Cha đổi từ `@vitejs/plugin-react-swc` sang `@vitejs/plugin-react`, lock file (`bun.lock`) đã được cập nhật nhưng project dùng **npm** trên Cloudflare Pages. CF chạy `npm ci` — lệnh này yêu cầu `package-lock.json` phải khớp chính xác với `package.json`. Project hiện không có `package-lock.json` hợp lệ (hoặc đang dùng `bun.lock`), nên bị lỗi.

### Cách sửa

Tạo lại `package-lock.json` bằng cách chạy `npm install` trong project. Lovable dùng bun nên cần:

1. **Xóa `bun.lock`** và tạo `package-lock.json` mới — hoặc —
2. **Đổi build command trên CF Pages** từ mặc định sang `npm install && npm run build` (thay vì `npm ci`).

**Cách đơn giản nhất**: Đổi build command trên Cloudflare Pages dashboard:
- Build command: `npm install && npm run build` (thay vì chỉ `npm run build`)

Điều này sẽ chạy `npm install` (tự tạo lock file) trước khi build, tránh lỗi `npm ci`.

### Thay đổi cần làm

| # | Việc | Chi tiết |
|---|------|----------|
| 1 | Thêm file `package-lock.json` | Chạy lệnh tương đương `npm install` để sinh lock file mới đồng bộ với `package.json` hiện tại |

Cha sẽ regenerate `package-lock.json` cho con bằng cách trigger lại install dependencies trong project.

