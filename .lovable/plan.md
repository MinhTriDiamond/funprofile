

# Fix Swap: Lodash crash + Token dropdown + Success notification

## Vấn đề

### 1. Lodash crash vẫn còn (ưu tiên cao nhất)
Screenshot cho thấy lỗi `lodash/get.js does not provide an export named 'default'` vẫn xảy ra. Lý do: `optimizeDeps.include: ['lodash']` chỉ pre-bundle entry chính `lodash/index.js`, nhưng `@metamask/utils` import subpath `lodash/get` — Vite không tự pre-bundle subpath imports.

**Fix**: Thêm các lodash submodule cụ thể vào `optimizeDeps.include` và thêm Vite plugin nhỏ để xử lý CJS interop cho lodash subpath.

### 2. Token dropdown không click được  
Code hiện tại dùng Radix `DropdownMenu` đúng cách, nhưng có thể bị z-index conflict với Dialog parent hoặc CSS issue. Cần đảm bảo `pointer-events`, `z-index`, và trigger area hoạt động đúng.

### 3. Thiếu thông báo swap thành công chi tiết
Hiện chỉ có `toast.success` đơn giản. Cần thêm thông báo rõ ràng hơn với chi tiết giao dịch.

## Các file cần sửa

### File 1: `vite.config.ts`
- Thay `'lodash'` bằng các subpath cụ thể: `'lodash/get'`, `'lodash/set'`, `'lodash/cloneDeep'`, `'lodash/isEqual'`
- Thêm `'@metamask/utils > lodash/get'` (Vite nested dep syntax)

### File 2: `src/components/wallet/SwapTab.tsx`
- **TokenSelector**: Thêm `type="button"` explicit, tăng z-index cho `DropdownMenuContent` (`z-[100]`), đảm bảo `pointer-events-auto` trên trigger
- **FUN token**: Thêm vào danh sách hiển thị nhưng disabled
- **Success toast**: Thay toast đơn giản bằng toast chi tiết với số lượng from/to, tx hash link đến BscScan
- **Flip button z-index**: Giảm xuống để không chặn dropdown

### File 3: `src/config/swap.ts`
- Thêm `'FUN'` vào type `SwappableSymbol` nhưng giữ riêng list `DISABLED_SYMBOLS = ['FUN']` để UI hiển thị disabled

## Tổng: 3 file sửa nhỏ, không tạo file mới

