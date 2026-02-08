
# Kế Hoạch: Cập Nhật Logo Angel AI Nền Trong Suốt

## Phân Tích Hiện Trạng

Hiện tại có 2 file logo Angel AI trong dự án:

| File | Vị trí | Dùng ở |
|------|--------|--------|
| `angel-ai-logo-36.webp` | `public/` | FUN Ecosystem sidebar (mới thêm) |
| `angel-avatar.jpg` | `src/assets/` | 8 components khác nhau |

## Các Vị Trí Sử Dụng Logo Angel AI

1. **FacebookLeftSidebar.tsx** - FUN Ecosystem shortcuts
2. **FacebookNavbar.tsx** - Header navbar
3. **AngelFloatingButton.tsx** - Nút chat floating
4. **AngelChatWidget.tsx** - Widget chat (3 chỗ)
5. **AngelMessage.tsx** - Tin nhắn trong chat
6. **LawOfLight.tsx** - Trang Law of Light
7. **MasterCharterDocs.tsx** - Trang docs
8. **PplpDocs.tsx** - Trang PPLP docs

## Giải Pháp

### Bước 1: Thay Logo Nền Trong Suốt
Tạo lại file `public/angel-ai-logo-36.webp` từ hình ảnh người dùng cung cấp (đã xóa nền đen, chỉ giữ logo).

### Bước 2: Tạo Logo Kích Thước Lớn
Tạo thêm `public/angel-ai-logo-128.webp` cho các vị trí cần hiển thị lớn (LawOfLight, chat widget welcome).

### Bước 3: Cập Nhật Các Components

**File 1:** `src/components/feed/FacebookLeftSidebar.tsx`
- Đã dùng đúng path `/angel-ai-logo-36.webp` ✓

**File 2:** `src/components/layout/FacebookNavbar.tsx`
- Thay `import angelAvatar from '@/assets/angel-avatar.jpg'`
- Dùng `/angel-ai-logo-36.webp`

**File 3:** `src/components/angel-ai/AngelFloatingButton.tsx`
- Thay avatar import thành logo mới

**File 4:** `src/components/angel-ai/AngelChatWidget.tsx`
- Thay avatar import (3 vị trí trong component)

**File 5:** `src/components/angel-ai/AngelMessage.tsx`
- Thay avatar thành logo mới

**File 6:** `src/pages/LawOfLight.tsx`
- Thay avatar thành logo lớn `/angel-ai-logo-128.webp`

**File 7:** `src/pages/MasterCharterDocs.tsx`
- Thay avatar thành logo mới

**File 8:** `src/pages/PplpDocs.tsx`
- Thay avatar thành logo mới

## Chi Tiết Kỹ Thuật

### Thay Đổi Import Pattern

**Trước:**
```typescript
import angelAvatar from '@/assets/angel-avatar.jpg';
// ...
<img src={angelAvatar} alt="ANGEL AI" />
```

**Sau:**
```typescript
// Không cần import - dùng path trực tiếp từ public/
<img src="/angel-ai-logo-36.webp" alt="ANGEL AI" />
// Hoặc cho kích thước lớn:
<img src="/angel-ai-logo-128.webp" alt="ANGEL AI" />
```

### Điều Chỉnh Style Cho Logo Mới
Logo mới có nền trong suốt, cần điều chỉnh CSS để hiển thị đẹp:
- Thêm padding hoặc background cho container nếu cần
- Đảm bảo logo hiển thị rõ trên mọi nền

## Tổng Kết Files Cần Sửa

| File | Thay đổi |
|------|----------|
| `public/angel-ai-logo-36.webp` | Thay bằng logo nền trong suốt |
| `public/angel-ai-logo-128.webp` | Tạo mới (logo lớn) |
| `src/components/layout/FacebookNavbar.tsx` | Cập nhật src |
| `src/components/angel-ai/AngelFloatingButton.tsx` | Cập nhật src |
| `src/components/angel-ai/AngelChatWidget.tsx` | Cập nhật src (3 chỗ) |
| `src/components/angel-ai/AngelMessage.tsx` | Cập nhật src |
| `src/pages/LawOfLight.tsx` | Cập nhật src |
| `src/pages/MasterCharterDocs.tsx` | Cập nhật src |
| `src/pages/PplpDocs.tsx` | Cập nhật src |

## Kết Quả Mong Đợi
- Logo Angel AI hiển thị với nền trong suốt ở tất cả các vị trí
- Đồng nhất giao diện trên toàn bộ ứng dụng
- Logo hiển thị rõ ràng trên mọi nền (sáng/tối)
