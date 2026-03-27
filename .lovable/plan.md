

## Sửa lỗi sidebar và các chỗ hiển thị tiếng Anh khi chọn tiếng Việt

### Vấn đề
Khi user chọn tiếng Việt, sidebar trái hiển thị nhiều label bằng tiếng Anh:
- **"benefactors"**, **"donationHistory"**, **"memberList"**, **"connectedApps"**, **"ssoDocs"** — đây là các raw key hiện nguyên vì thiếu translation key trong EN và VI
- **"About FUN Profile"** — hiển thị từ `item.name` hardcoded trong config, không qua `t()`

### Giải pháp

#### 1. Thêm translation keys vào `src/i18n/translations.ts`
Thêm các key sau vào **EN** và **VI** (và các ngôn ngữ đã có sẵn nếu cần):

| Key | EN | VI |
|-----|----|----|
| `benefactors` | `Benefactors` | `Mạnh Thường Quân` |
| `donationHistory` | `Gift History` | `Lịch sử tặng quà` |
| `memberList` | `Member List` | `Danh sách thành viên` |
| `connectedApps` | `Connected Apps` | `Ứng dụng liên kết` |
| `ssoDocs` | `SSO Docs` | `Tài liệu SSO` |

#### 2. Sửa `src/components/feed/EcosystemWheel.tsx`
- Import `useLanguage`
- Với item `id === 'about'`, hiển thị `t('aboutFunProfile')` thay vì `item.name`
- Các item khác giữ `item.name` vì là tên thương hiệu (Law of Light, Angel AI, FUN Play...)

### Quy mô
- 2 file cần sửa
- ~5 translation keys mới cần thêm cho EN + VI

