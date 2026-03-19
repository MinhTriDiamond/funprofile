

## Kết quả kiểm tra nhánh Bé-Trí trước khi merge

### ✅ Đã OK
- `bun.lock` đã xóa, `package-lock.json` đã có — CF deploy sẽ hoạt động
- `vite.config.ts` dùng đúng `@vitejs/plugin-react` (không phải SWC)
- Build config, chunk splitting, esbuild drops — tốt

### ⚠️ Cần sửa trước khi merge (3 vấn đề)

#### 1. **Bug nghiêm trọng: Biến `token` bị shadowed trong `live-token/index.ts`**

Dòng 30 khai báo `const token = authHeader.replace('Bearer ', '')`, sau đó dòng 110 lại khai báo `const token = RtcTokenBuilder.buildTokenWithUid(...)`. Biến thứ hai shadow biến thứ nhất — tuy build không lỗi nhưng nếu có lỗi runtime sẽ rất khó debug. Cần đổi tên biến Agora thành `agoraToken`.

#### 2. **Package.json: `@vitejs/plugin-react-swc` vẫn còn trong devDependencies**

Dòng 88 — plugin SWC không còn dùng nhưng vẫn nằm trong `devDependencies`. Cần xóa để tránh cài thừa dependency và gây nhầm lẫn.

Đồng thời, `@vitejs/plugin-react` (dòng 48) đang nằm trong `dependencies` thay vì `devDependencies` — nên chuyển sang đúng chỗ.

#### 3. **Memory leak + auto-close 30 phút (đã phát hiện trước đó, chưa sửa)**

- `chunkedRecorder.ts` dòng 59+84: mảng `allChunks` giữ toàn bộ blob trong RAM → crash sau ~32 phút
- `auto-finalize-recordings` dòng 405: threshold 30 phút tự đóng session live

**Hai lỗi này là nguyên nhân user phản hồi "video chỉ lưu 32 phút"** — nên sửa trước hoặc ngay sau khi merge.

---

### Kế hoạch sửa

| # | File | Thay đổi |
|---|------|----------|
| 1 | `supabase/functions/live-token/index.ts` | Đổi `const token` (dòng 110) thành `const agoraToken`, cập nhật reference ở dòng 122 |
| 2 | `package.json` | Xóa `@vitejs/plugin-react-swc` khỏi devDeps, chuyển `@vitejs/plugin-react` từ deps sang devDeps |
| 3 | `src/modules/live/recording/chunkedRecorder.ts` | Xóa mảng `allChunks`, hàm `stop()` trả blob rỗng |
| 4 | `supabase/functions/auto-finalize-recordings/index.ts` | Tăng threshold từ 30 phút lên 4 giờ |

