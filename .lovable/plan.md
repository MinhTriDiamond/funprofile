
# Hoàn Thiện Trang Profile Facebook-Like

## Tổng Quan

Nâng cấp toàn diện trang Profile theo phong cách Facebook 2025, bao gồm: thêm địa chỉ ví công khai, cải thiện FriendRequestButton với dropdown và text tiếng Việt, hiển thị action buttons trên desktop, và tổ chức lại tabs + Honor Board.

## Thay Đổi Cần Thực Hiện

### 1. Database: Thêm cột `public_wallet_address`

Migration SQL:
```sql
ALTER TABLE public.profiles ADD COLUMN public_wallet_address text;
```
- Nullable, text
- RLS: read public (da co san), update chi owner (da co san vi profiles co RLS update WHERE id = auth.uid())

### 2. Cập nhật `FriendRequestButton.tsx` -- UI tiếng Việt + Dropdown "Hủy kết bạn"

Hiện tại:
- Text tiếng Anh cứng ("Add Friend", "Unfriend", "Cancel Request", "Accept", "Reject")
- Trạng thái "accepted" chỉ hiện nút "Unfriend" trực tiếp

Sửa thành:
- Dùng `useLanguage()` + i18n keys cho tất cả text
- Trạng thái `accepted`: hiện nút "Ban be" (icon UserCheck + chevron down) -> click mở dropdown với tùy chọn "Hủy kết bạn"
- Trạng thái `none`: "Thêm bạn bè" (UserPlus)
- Trạng thái `pending_sent`: "Đã gửi lời mời" (Clock) -> click hủy
- Trạng thái `pending_received`: "Chấp nhận" + "Từ chối"

### 3. Cập nhật `Profile.tsx` -- Header + Actions + Tabs

#### 3a. Địa chỉ ví công khai trong header
- Dưới username + friends count, thêm hiển thị `public_wallet_address`:
  - Rút gọn: `0x1234...abcd`
  - Nút copy -> toast "Đã copy địa chỉ ví"
  - Chủ profile chưa có ví: CTA "Thêm địa chỉ ví công khai" -> chuyển sang tab edit
  - Người khác chưa có ví: hiện "Chưa cập nhật"

#### 3b. Action buttons hiển thị trên CẢ desktop và mobile
- Hiện tại action buttons (Bạn bè, Nhắn tin, Tặng quà) chỉ hiện trên mobile (`md:hidden`)
- Sửa: bỏ `md:hidden`, hiển thị trên mọi breakpoint
- Chủ profile: hiện nút "Chỉnh sửa trang cá nhân" thay vì 3 nút kia
- Desktop: nằm bên phải header info, ngang hàng
- Mobile: giữ layout hiện tại (centered, wrap)

#### 3c. Tabs: thêm tab "HONOR BOARD"
- Thêm TabsTrigger cho "HONOR BOARD" (hiện trên mobile, vi Honor Board desktop đã ở header section)
- Tab "HONOR BOARD" content: render `CoverHonorBoard` component
- Đổi tab "edit" label thành key i18n `editProfile` (thay vì `moreOptions`)

#### 3d. Fetch `public_wallet_address` trong query
- Thêm `public_wallet_address` vào select query trong `fetchProfile()`

### 4. Cập nhật `EditProfile.tsx` -- Thêm field "Địa chỉ ví công khai"

- Thêm input field "Địa chỉ ví công khai" dưới bio
- Validate EVM address: `/^0x[a-fA-F0-9]{40}$/`
- Lưu vào `public_wallet_address` cùng lúc với các field khác
- Toast "Đã cập nhật địa chỉ ví công khai" khi lưu thành công

### 5. Tab "Giới thiệu" -- Hiển thị ví công khai

- Thêm row hiển thị `public_wallet_address` trong tab About
- Icon Wallet + địa chỉ rút gọn + nút copy
- Chủ profile: có nút "Chỉnh sửa" chuyển sang tab edit

### 6. i18n -- Thêm translation keys mới

Keys cần thêm (cho tất cả 13 ngôn ngữ, ưu tiên vi + en):
- `publicWalletAddress`: "Địa chỉ ví công khai" / "Public Wallet Address"
- `addPublicWallet`: "Thêm địa chỉ ví công khai" / "Add Public Wallet"
- `walletCopied`: "Đã copy địa chỉ ví" / "Wallet address copied"
- `notUpdated`: "Chưa cập nhật" / "Not updated"
- `friendStatus`: "Bạn bè" / "Friends"
- `addFriendBtn`: "Thêm bạn bè" / "Add Friend"
- `requestSent`: "Đã gửi lời mời" / "Request Sent"
- `unfriend`: "Hủy kết bạn" / "Unfriend"
- `acceptRequest`: "Chấp nhận" / "Accept"
- `rejectRequest`: "Từ chối" / "Reject"
- `editPersonalPage`: "Chỉnh sửa trang cá nhân" / "Edit Profile"
- `invalidWalletAddress`: "Địa chỉ ví không hợp lệ" / "Invalid wallet address"
- `honorBoard` (da co)

## Danh Sách Files

| File | Hành động |
|------|-----------|
| Migration SQL | **Tạo** -- thêm cột `public_wallet_address` |
| `src/pages/Profile.tsx` | **Cập nhật** -- header ví, action buttons desktop, tab Honor Board, fetch public_wallet_address |
| `src/components/friends/FriendRequestButton.tsx` | **Cập nhật** -- i18n, dropdown cho trạng thái "accepted" |
| `src/components/profile/EditProfile.tsx` | **Cập nhật** -- thêm field ví công khai |
| `src/i18n/translations.ts` | **Cập nhật** -- thêm keys mới cho 13 ngôn ngữ |

## Chi Tiết Kỹ Thuật

### Layout Header Desktop (sau khi sửa)

```text
+------------------------------------------------------------------+
|                    [Cover Photo]                                  |
|                                              [Honor Board]       |
|                                              (giữ vị trí phải)   |
+------------------------------------------------------------------+
| [Avatar]  Username                    [Bạn bè v] [Nhắn tin] [Tặng quà] |
|           123 bạn bè                                              |
|           0x1234...abcd [copy]                                    |
|           Bio text here...                                        |
|           VN | FUN Ecosystem                                      |
|           [friend avatars]                                        |
+------------------------------------------------------------------+
| [Bài viết] [Giới thiệu] [Ảnh] [Bạn bè] [Honor Board] [Chỉnh sửa] |
+------------------------------------------------------------------+
```

Khi là chủ profile, thay 3 nút action bằng: `[Chỉnh sửa trang cá nhân]`

### FriendRequestButton -- Trạng thái "accepted" dropdown

```text
+------------------+
| ✓ Bạn bè    ▼   |  <- Button chính
+------------------+
      |
      +-------------------+
      | ✗ Hủy kết bạn     |  <- Dropdown item
      +-------------------+
```

Sử dụng DropdownMenu từ shadcn (đã có trong project).

### Tương thích 4 phương thức đăng nhập

Profile page dùng `supabase.auth.getUser()` và `supabase.auth.getSession()` -- cả 2 đều hoạt động đồng nhất cho OTP, Wallet, Google, Password vì Supabase Auth trả về cùng format session. Không cần logic đặc biệt theo phương thức đăng nhập.

Điểm cần lưu ý:
- Wallet login: user có thể đã có `external_wallet_address` nhưng `public_wallet_address` là field riêng do user tự cập nhật
- Google/OTP login: user chưa có wallet address nào -> CTA "Thêm địa chỉ ví công khai"
- Tất cả auth methods đều tạo profile row qua trigger -> EditProfile luôn tìm được profile

### Validation địa chỉ ví

Dùng regex đơn giản (không cần import viem):
```typescript
const isValidEvmAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
```
