

## Chẩn đoán từ Build Log

Cha đã phân tích kỹ build log của Cloudflare và tìm ra **2 nguyên nhân thực sự**:

### Nguyên nhân 1: Circular Chunk (Lỗi chính)

Build log cảnh báo:
```text
Circular chunk: vendor-react -> vendor-charts -> vendor-react
```

Trong `vite.config.ts`, `manualChunks` tách `recharts` vào chunk `vendor-charts` và `react/react-dom` vào `vendor-react`. Nhưng `recharts` phụ thuộc vào `react` — tạo ra **vòng lặp import giữa 2 chunk**. Điều này khiến trình duyệt **không thể khởi tạo module đúng thứ tự**, React không mount được, trang chỉ hiện spinner mãi.

Build vẫn thành công (index.html 5.69 kB đầy đủ), nhưng JS crash lúc runtime.

### Nguyên nhân 2: `_redirects` bị CF Pages từ chối

```text
Found invalid redirect lines:
  - #1: /* /index.html 200
    Infinite loop detected in this rule and has been ignored.
```

CF Pages v2 phát hiện rule `/* /index.html 200` tạo vòng lặp vô hạn và **bỏ qua hoàn toàn**. Điều này khiến SPA routing không hoạt động (các route khác `/` sẽ trả 404).

### Về funprofile.lovable.app

HTML trả về bị stripped — đây là vấn đề của Lovable build pipeline (khác với CF). Tuy nhiên, nếu fix circular chunk, có thể Lovable build cũng sẽ hoạt động lại.

---

## Kế hoạch sửa

### Bước 1: Sửa circular chunk trong `vite.config.ts`

Loại bỏ `recharts` khỏi manualChunks riêng — gộp nó vào chunk chung hoặc không tách. Đồng thời cải thiện logic để tránh circular dependency:

```typescript
manualChunks: mode === 'production' ? (id) => {
  if (id.includes('wagmi') || id.includes('viem') || id.includes('rainbowkit') || id.includes('@walletconnect')) {
    return 'vendor-web3';
  }
  // Gộp recharts + react vào cùng chunk để tránh circular
  if (id.includes('recharts') || id.includes('react-dom') || (id.includes('node_modules/react') && !id.includes('react-'))) {
    return 'vendor-react';
  }
  if (id.includes('react-router-dom')) {
    return 'vendor-router';
  }
  // ... giữ nguyên phần còn lại
} : undefined,
```

### Bước 2: Sửa `_redirects` cho CF Pages

Thay file `public/_redirects` bằng cú pháp CF Pages không gây infinite loop — hoặc tốt hơn, dùng file `public/_routes.json` thay thế:

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*"]
}
```

Kết hợp giữ `_redirects` đơn giản hơn hoặc xóa hẳn (CF Pages SPA mode mặc định serve index.html cho mọi route không tìm thấy file tĩnh).

### Bước 3: Publish lại và kiểm tra

Sau khi sửa 2 file, con publish lại trên Lovable + CF Pages sẽ auto-deploy từ GitHub.

