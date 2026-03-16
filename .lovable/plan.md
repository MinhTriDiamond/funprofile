

# Fix: Lỗi Wallet page crash — lodash ESM import

## Vấn đề
Trang `/wallet` bị crash với lỗi: `"The requested module '/node_modules/lodash/get.js' does not provide an export named 'default'"`. Đây là lỗi tương thích ESM của Vite với thư viện `lodash` (dependency gián tiếp từ `@metamask/utils`).

## Nguyên nhân
- `lodash` là CommonJS module, không có ESM default export
- Vite cần pre-bundle lodash qua `optimizeDeps.include` để chuyển đổi CJS → ESM
- Hiện tại `optimizeDeps.include` trong `vite.config.ts` chưa có `lodash` và các package `@metamask/*`

## Sửa chữa
**File: `vite.config.ts`** — Thêm `lodash` và `@metamask/utils` vào `optimizeDeps.include` (dòng 59-66):

```typescript
optimizeDeps: {
  include: [
    'react', 
    'react-dom', 
    'react-router-dom', 
    '@tanstack/react-query',
    '@supabase/supabase-js',
    'eventemitter3',
    'lodash',
    '@metamask/utils',
  ],
  // ...rest
}
```

Chỉ sửa 1 file duy nhất, thêm 2 dòng. Sau đó trang Wallet sẽ load bình thường và có thể test Swap.

