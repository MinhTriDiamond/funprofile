
## Nguyên nhân
File `src/components/wallet/WalletCenterContainer.tsx` (dòng 447-451) check `hasSocialLinks` sai cấu trúc dữ liệu:

```ts
hasSocialLinks={(() => {
  const links = profile?.social_links;
  if (!links || typeof links !== 'object') return false;
  return Object.values(links as Record<string, unknown>).some(v => typeof v === 'string' && v.trim().length > 0);
})()}
```

Logic này giả định `social_links` là object dạng `{facebook: "url", twitter: "url"}` — nhưng thực tế DB lưu là **array of objects**: `[{platform, label, url, color, favicon}]` (xem `useProfile.ts` dòng 31 + cách lưu trong `AvatarOrbit.tsx`).

Khi áp `Object.values()` lên array, nó trả về các object con (không phải string) → `typeof v === 'string'` luôn false → `hasSocialLinks` luôn false → user thấy "❌ Liên kết mạng xã hội" dù đã thêm link.

## Sửa (1 file)

### `src/components/wallet/WalletCenterContainer.tsx` (dòng 447-451)
Thay logic check bằng kiểm tra đúng cấu trúc array, hỗ trợ cả 2 dạng (array mới + object cũ để tương thích ngược):

```ts
hasSocialLinks={(() => {
  const links = profile?.social_links;
  if (!links) return false;
  // Dạng array (chuẩn hiện tại): [{platform, url, ...}]
  if (Array.isArray(links)) {
    return links.some((l: any) => typeof l?.url === 'string' && l.url.trim().length > 0);
  }
  // Fallback dạng object cũ: {facebook: "url"}
  if (typeof links === 'object') {
    return Object.values(links as Record<string, unknown>).some(v => typeof v === 'string' && v.trim().length > 0);
  }
  return false;
})()}
```

## Phạm vi
- 1 file, 1 đoạn logic ~6 dòng.
- Không đụng schema/RLS/edge function/UI.
- Sau khi sửa: user đã thêm link sẽ thấy ✅ và đủ điều kiện claim.
