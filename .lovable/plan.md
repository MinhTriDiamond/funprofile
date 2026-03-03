

# Hoàn thiện Platform Grid với logo chính thức

## Hiện trạng
- Platform grid đang dùng **emoji** thay vì logo chính thức
- Các logo 36px đã có sẵn trong `public/`: `angel-ai-logo-36.png`, `fun-play-logo-36.webp`, `fun-farm-logo-36.webp`, `fun-planet-logo-36.webp`, `fun-charity-logo-36.webp`, `fun-academy-logo-36.webp`, `green-earth-logo-36.webp`
- **Thiếu**: logo FUN Life (user vừa upload) và logo FUN Profile dạng nhỏ

## Thay đổi

### 1. Copy logo FUN Life vào project
- Copy `user-uploads://FUN_Life.webp` → `public/fun-life-logo-36.webp`

### 2. Cập nhật `src/pages/Auth.tsx`
Thay `ECOSYSTEM_PLATFORMS` từ dùng emoji sang dùng logo path:

```typescript
const ECOSYSTEM_PLATFORMS = [
  { name: 'FUN Profile', logo: '/fun-profile-logo-40.webp' },
  { name: 'Angel AI', logo: '/angel-ai-logo-36.png' },
  { name: 'FUN Play', logo: '/fun-play-logo-36.webp' },
  { name: 'FUN Academy', logo: '/fun-academy-logo-36.webp' },
  { name: 'Green Earth', logo: '/green-earth-logo-36.webp' },
  { name: 'FUN Planet', logo: '/fun-planet-logo-36.webp' },
  { name: 'FUN Farm', logo: '/fun-farm-logo-36.webp' },
  { name: 'FUN Charity', logo: '/fun-charity-logo-36.webp' },
  { name: 'FUN Life', logo: '/fun-life-logo-36.webp' },
];
```

Thay phần render từ emoji sang `<img>`:
```tsx
<img src={platform.logo} alt={platform.name} className="w-7 h-7 rounded-full object-cover" />
```

Chỉ sửa 1 file + copy 1 asset.

