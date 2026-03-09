

## Kế hoạch: Cập nhật Mobile/Tablet UI — Settings + Language Menu

### Phân tích hiện trạng

**`FacebookLeftSidebar.tsx`** — Sidebar dùng cho cả mobile và desktop (qua Sheet trên mobile):
- Card "Lối tắt của bạn": có mục **Bảo mật** → `/settings/security` (dòng 71)
- Card "Menu": có `LanguageSwitcher variant="full"` — chỉ hiện EN/VI toggle (dòng 281)
- Không có mục **Cài đặt**
- Thứ tự Menu: Language (EN/VI) → Admin → Sign Out

**`FacebookNavbar.tsx`** — Desktop dropdown profile menu:
- Đã có language selector đầy đủ 13 ngôn ngữ (dòng 316-356)
- Đã có mục **Cài đặt** → `/settings` (dòng 361-367)

### Thay đổi cần thực hiện

**File duy nhất cần sửa: `src/components/feed/FacebookLeftSidebar.tsx`**

#### 1. Shortcut items — Thay "Bảo mật" bằng "Cài đặt"
- Xóa: `{ icon: Shield, label: 'Bảo mật', path: '/settings/security' }`
- Thêm vào Card Menu (trước Admin): `{ icon: Settings, label: 'Cài đặt', path: '/settings' }`

#### 2. Language selector — Thay `variant="full"` (EN/VI toggle) bằng dropdown đầy đủ 13 ngôn ngữ
- Thay `LanguageSwitcher variant="full"` bằng `LanguageSwitcher variant="dropdown"`
- Hoặc tự render inline danh sách ngôn ngữ từ `languageOptions` giống navbar

#### 3. Thứ tự Menu Card mới
```text
🌐 Language (dropdown 13 ngôn ngữ)
↓
⚙️ Cài đặt → /settings
↓
🛡️ Admin Dashboard (nếu admin)
↓
🚪 Sign Out
```

#### 4. Import updates
- Thêm `Settings` icon từ lucide-react
- Xóa `Shield` khỏi shortcutItems (vẫn giữ import vì Admin dùng)

### Desktop UI — Không thay đổi
Sidebar này cũng render trên desktop ở trang Feed, nhưng thay đổi này cải thiện cả hai vì logic đúng: truy cập Security qua Settings, không trực tiếp.

