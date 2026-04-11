

## Kế hoạch: Lưu trạng thái tab cho toàn bộ Fun.Rich

### Vấn đề
Khi chuyển trang rồi quay lại, tất cả tab đều reset về mặc định. Hook `usePersistedTab` đã được tạo nhưng chưa áp dụng vào bất kỳ component nào.

### Giải pháp
Thay thế `useState` bằng `usePersistedTab` ở tất cả các trang/component có tab chính:

### Các file cần sửa

| File | Tab state hiện tại | Storage key |
|------|-------------------|-------------|
| `src/pages/Admin.tsx` | `useState(() => ...)` → `usePersistedTab` | `admin-tab` |
| `src/pages/Benefactors.tsx` | `useState('donors')` | `benefactors-tab` |
| `src/pages/Friends.tsx` | `useState('all')` | `friends-tab` |
| `src/hooks/useProfile.ts` | `useState('posts')` | `profile-tab` |
| `src/components/admin/RewardApprovalTab.tsx` | `useState('pending-claims')` | `admin-reward-tab` |
| `src/components/admin/PplpMintTab.tsx` | `useState('pending_sig')` | `admin-pplp-tab` |
| `src/components/admin/FinancialTab.tsx` | `useState('users')` | `admin-financial-tab` |
| `src/components/admin/FinanceDonationsTab.tsx` | `defaultValue="financial"` → controlled | `admin-finance-tab` |
| `src/components/admin/FraudTab.tsx` | `defaultValue="abuse"` → controlled | `admin-fraud-tab` |
| `src/components/admin/UserManagementTab.tsx` | `defaultValue="review"` → controlled | `admin-users-tab` |

### Chi tiết kỹ thuật

Mỗi file sẽ:
1. Import `usePersistedTab` thay vì dùng `useState`
2. Thay `useState('default')` bằng `usePersistedTab('storage-key', 'default', validValues)`
3. Với các component dùng `Tabs defaultValue=`, đổi sang `Tabs value={activeTab} onValueChange={setActiveTab}`
4. Với Admin.tsx, giữ logic URL param `?tab=` làm ưu tiên cao hơn localStorage

Không thay đổi giao diện hay logic nghiệp vụ, chỉ thêm persistence.

