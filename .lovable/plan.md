

## Sửa lỗi trang Wallet bị crash — lodash ESM import

### Nguyên nhân
Trang Wallet crash với lỗi: `SyntaxError: lodash/isNumber.js does not provide an export named 'default'`. Đây là lỗi tương thích ESM/CJS của lodash khi Vite cố pre-bundle. Một dependency (có thể `@metamask/utils` hoặc `@walletconnect`) import `lodash/isNumber` nhưng Vite không pre-optimize nó.

### Dữ liệu angelaivan
Dữ liệu giao dịch **đã đầy đủ** trong hệ thống — không cần thay đổi dữ liệu. Khi trang Wallet hết crash, lịch sử sẽ hiển thị bình thường.

### Thay đổi

**File: `vite.config.ts`**
- Thêm `lodash/isNumber` (và các module lodash con khác có thể thiếu) vào `optimizeDeps.include` để Vite pre-bundle đúng cách, tránh lỗi ESM default export.

```text
optimizeDeps.include sẽ thêm:
  'lodash/isNumber',
  'lodash/isPlainObject',
  'lodash/isFunction',
  'lodash/isArray',
```

### Kết quả mong đợi
- Trang Wallet không còn crash
- Lịch sử giao dịch của angelaivan hiển thị đầy đủ (donations, swaps, transfers)

