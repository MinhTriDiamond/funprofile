

## Kế hoạch: Chuẩn hóa Navigation — Single Source of Truth

### Phân tích hiện trạng

Hiện tại navigation bị phân tán ở 3 nơi:
- **`FacebookNavbar.tsx`** (desktop top nav): hardcode `iconNavItems`, `languageOptions`, user menu inline
- **`FacebookLeftSidebar.tsx`** (sidebar cho cả mobile drawer + desktop left): hardcode `shortcutItems`, `ecosystemShortcuts`, menu items inline
- **`MobileBottomNav.tsx`** (bottom nav mobile): hardcode `navItems` riêng
- **`LanguageSwitcher.tsx`**: đã có `languageOptions` 13 ngôn ngữ — đây là nguồn tốt nhất

**Vấn đề**: Mỗi component tự định nghĩa menu items → dễ lệch nhau giữa device.

---

### Thực hiện

#### 1. Tạo `src/config/navigation.ts` — Single Source of Truth

Chứa toàn bộ navigation config:

```typescript
export const navigationConfig = {
  // Top nav items (Home, Friends, Reels, Chat, Wallet)
  topNav: [...],
  
  // Ecosystem shortcuts (Law of Light, Angel AI, FUN Play, ...)  
  ecosystem: [...],
  
  // Your Shortcuts (Mạnh Thường Quân, Lịch Sử Giao Dịch, ...)
  shortcuts: [...],
  
  // User menu items (Language, Settings, Admin, Sign Out)
  userMenu: [...],
  
  // Language options (13 ngôn ngữ) — move từ LanguageSwitcher
  languages: [...],
}
```

Mỗi item có structure:
```typescript
interface NavItem {
  id: string;
  labelKey: string;        // i18n key
  icon?: string;           // lucide icon name
  route?: string;
  externalUrl?: string;
  avatar?: string;         // cho ecosystem items
  adminOnly?: boolean;
  authRequired?: boolean;
  feature?: string;        // future feature flag
}
```

#### 2. Cập nhật `LanguageSwitcher.tsx`
- Import `languages` từ `navigation.ts` thay vì hardcode
- Giữ nguyên UI các variant

#### 3. Cập nhật `FacebookNavbar.tsx`  
- Import `topNav`, `languages`, `userMenu` từ config
- Xóa hardcode `languageOptions` (dòng 96-110) và `iconNavItems` (dòng 113-120)
- User menu dropdown đọc từ `userMenu` config

#### 4. Cập nhật `FacebookLeftSidebar.tsx`
- Import `ecosystem`, `shortcuts`, `userMenu` từ config
- Xóa hardcode `shortcutItems` (dòng 71-80) và `ecosystemShortcuts` (dòng 83-161)
- Menu card đọc từ `userMenu` config (Language, Settings, Admin, Sign Out)

#### 5. Cập nhật `MobileBottomNav.tsx`
- Import `topNav` từ config cho bottom nav items
- Giữ logic đặc biệt (Honor Board center button, Gift button)

#### 6. User Menu thống nhất
Desktop dropdown (FacebookNavbar) và Sidebar menu card (FacebookLeftSidebar) đều render cùng items từ `userMenu`:
1. Language (LanguageSwitcher dropdown)
2. Settings → `/settings`
3. Admin Dashboard → `/admin` (adminOnly)
4. Sign Out

---

### Files cần tạo/sửa

| File | Thay đổi |
|---|---|
| `src/config/navigation.ts` | **Tạo mới** — Single source of truth |
| `src/components/layout/LanguageSwitcher.tsx` | Import languages từ config |
| `src/components/layout/FacebookNavbar.tsx` | Import từ config, xóa hardcode |
| `src/components/feed/FacebookLeftSidebar.tsx` | Import từ config, xóa hardcode |
| `src/components/layout/MobileBottomNav.tsx` | Import từ config |

### Không thay đổi
- Routes / routing logic
- Desktop UI layout
- Component styling
- Edge functions / backend

