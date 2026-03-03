

# Nâng cấp trang Auth thành cổng đăng nhập chung FUN Ecosystem

## Tổng quan

Chuyển đổi trang `/auth` từ branding "FUN Profile" sang **FUN Ecosystem** — cổng đăng nhập chung cho tất cả các nền tảng (FUN Profile, Angel AI, FUN Play, FUN Academy, v.v.). Thiết kế theo phong cách **hologram đa sắc** lấy cảm hứng từ logo Ecosystem.

---

## Thay đổi chi tiết

### 1. Copy logo FUN Ecosystem vào project
- Copy `FUN_Ecosystem.png` → `public/fun-ecosystem-logo.webp` (logo chính)
- Copy `FUN_ECO_LOGO.jpg` → `public/fun-eco-platforms.webp` (ảnh tham khảo, không hiển thị trực tiếp)

### 2. Redesign Left Side — Auth.tsx

**Thay thế hoàn toàn phần branding bên trái:**

- **Logo**: Đổi từ `fun-profile-logo-128.webp` sang `fun-ecosystem-logo.webp` — viền hologram gradient nhiều màu (tím, xanh dương, cam, vàng) thay vì viền xanh lá metallic
- **Tiêu đề**: "FUN Ecosystem" thay vì "FUN Profile" — gradient hologram (tím → xanh dương → xanh lá → cam → hồng)
- **Mô tả**: Thay bằng mô tả hệ sinh thái ("Một tài khoản, mọi nền tảng FUN")
- **Feature list**: Thay danh sách phương thức đăng nhập bằng **vòng tròn logo các platform** hiển thị dạng hàng ngang/lưới nhỏ gọn với tên platform:
  - FUN Profile, Angel AI, FUN Play, FUN Academy, Green Earth, FUN Planet, FUN Farm, FUN Charity, FUN Life

### 3. Redesign Auth Card Frame — UnifiedAuthForm.tsx

- **Viền card**: Đổi từ gradient xanh lá metallic sang gradient hologram đa sắc (giống rainbow nhưng nhẹ nhàng, có hiệu ứng shimmer)
- **Tiêu đề card**: Đổi màu từ xanh lá sang hologram gradient
- **Tab bar**: Viền và text active đổi sang tông tím-xanh hologram
- Giữ nguyên logic 4 tab (OTP, Wallet, Social, Classic)

### 4. Nút "View as Guest" — Auth.tsx
- Giữ viền rainbow (đã có sẵn, phù hợp style mới)
- Đổi text gradient từ xanh lá metallic sang hologram gradient

### 5. Hiệu ứng CSS hologram
- Thêm CSS animation `hologram-shimmer` — gradient xoay chậm tạo hiệu ứng ánh sáng hologram trên viền card và logo
- Màu sắc chủ đạo: `#9333ea` (tím), `#3b82f6` (xanh dương), `#22c55e` (xanh lá), `#f97316` (cam), `#ec4899` (hồng)

### 6. Cập nhật translations (13 ngôn ngữ)
- `authBrandTitle`: "FUN Profile" → "FUN Ecosystem"
- `authBrandDescription`: Cập nhật mô tả hệ sinh thái
- Thêm key mới: `authEcosystemTagline` — "Một tài khoản. Mọi nền tảng."
- Thêm key: `authPlatformList` hoặc hardcode tên platform (vì tên platform không cần dịch)
- Xóa các feature items cũ (OTP, MetaMask, Google, Classic, Soul NFT) — thay bằng platform grid

### 7. SSO context awareness (tùy chọn)
- Khi có `sso_flow=true` từ Angel AI, hiển thị dòng nhỏ: "Đăng nhập để tiếp tục với Angel AI" kèm logo Angel AI — giúp user biết mình đang đăng nhập cho platform nào

---

## Cấu trúc file thay đổi

| File | Thay đổi |
|------|----------|
| `public/fun-ecosystem-logo.webp` | Thêm mới (copy từ upload) |
| `src/pages/Auth.tsx` | Redesign left side: logo, title, platform grid |
| `src/components/auth/UnifiedAuthForm.tsx` | Đổi viền card + tab sang hologram style |
| `src/i18n/translations.ts` | Cập nhật brand text cho 13 ngôn ngữ |
| `src/index.css` | Thêm `@keyframes hologram-shimmer` animation |

