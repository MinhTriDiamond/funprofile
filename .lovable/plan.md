

## Vấn đề

Trang ví bị crash hoàn toàn với lỗi:
```
SyntaxError: The requested module '/node_modules/lodash/isNaN.js' does not provide an export named 'default'
```

Đây là lỗi tương thích ESM của `lodash` khi Vite serve các sub-module chưa được pre-bundle. File `vite.config.ts` đã include `lodash`, `lodash/get`, `lodash/set`, `lodash/isEqual`, `lodash/cloneDeep` — nhưng thiếu `lodash/isNaN` mà `react-day-picker` v9 cần.

Trang profile hoạt động bình thường vì Calendar component ở đó được load trong chunk chính (không lazy), trong khi wallet page dùng lazy loading nên Vite xử lý dependency khác đi.

## Kế hoạch sửa

### File: `vite.config.ts`

Thêm `lodash/isNaN` vào `optimizeDeps.include` (dòng 59-72). Đồng thời thêm thêm vài lodash sub-module phổ biến khác để phòng ngừa lỗi tương tự:

```js
optimizeDeps: {
  include: [
    // ...existing entries...
    'lodash',
    'lodash/get',
    'lodash/set',
    'lodash/isEqual',
    'lodash/cloneDeep',
    'lodash/isNaN',     // ← thêm mới - fix crash wallet
    '@metamask/utils',
  ],
}
```

Chỉ cần sửa 1 file duy nhất, thêm 1 dòng. Không cần thay đổi logic hay component nào.

