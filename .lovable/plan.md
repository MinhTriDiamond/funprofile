
## Sắp xếp, tinh gọn và đồng bộ Admin Dashboard

### 1. Nhóm lại các tab (15 -> 8 nhóm)

Gom các tab có chức năng liên quan thành nhóm logic:

```text
Tab hiện tại (15)                    -> Tab mới (8)
─────────────────────────────────────────────────
Tổng quan                            -> Tổng quan (giữ nguyên, nâng cấp)
PPLP Mint                            -> PPLP Mint (giữ nguyên)
Financial                            -> Tài chính (gộp Financial + Donations)
Donations                            ->   (gộp vào Tài chính)
Duyệt thưởng                         -> Duyệt thưởng (giữ nguyên)
Rà soát + User ảo + Xóa nhanh        -> Quản lý User (gộp 3 tab thành sub-tabs)
Lạm dụng                             -> Chống gian lận (gộp Lạm dụng + Giám sát)
Giám sát                             ->   (gộp vào Chống gian lận)
Blockchain + Migration + Merge User   -> Hệ thống (gộp 3 tab ít dùng)
Duyệt bài                            -> Duyệt bài (giữ nguyên)
Social Links                         -> (chuyển vào Quản lý User dạng sub-tab)
```

### 2. Đồng bộ dữ liệu giữa các tab

**Vấn đề cốt lõi:** Khi ban user ở tab Giám sát, các tab khác (PPLP, Duyệt thưởng, Rà soát) vẫn hiển thị user đó như bình thường.

**Giải pháp: Dùng React Query + Event Bus**

- Tạo query key chuẩn hóa `['admin-users']` dùng chung cho toàn bộ dashboard
- Khi thực hiện hành động (ban, approve, reject) ở bất kỳ tab nào, gọi `queryClient.invalidateQueries({ queryKey: ['admin-users'] })` de cap nhat toan bo
- Tab Overview se doc tu cung nguon du lieu thay vi nhan stats tinh tu props
- Cac tab con nhu PplpMintTab se kiem tra `is_banned` cua user truoc khi hien thi

### 3. Chi tiet ky thuat

**Files can sua:**

1. **`src/pages/Admin.tsx`**: 
   - Giam tu 15 tabs xuong 8 tabs
   - Chuyen `loadAllUsers` sang React Query hook `useAdminUsers`
   - Truyen `queryClient.invalidateQueries` callback thong nhat

2. **`src/hooks/useAdminUsers.ts`** (moi):
   - Tap trung logic fetch va cache users
   - Export ham `invalidateAdminData()` de cac tab goi khi thay doi du lieu

3. **`src/components/admin/UserManagementTab.tsx`** (moi):
   - Gop UserReviewTab + GhostCleanupTab + QuickDeleteTab + SocialLinksTab thanh sub-tabs

4. **`src/components/admin/FraudTab.tsx`** (moi):
   - Gop WalletAbuseTab + SurveillanceTab thanh sub-tabs

5. **`src/components/admin/SystemTab.tsx`** (moi):
   - Gop BlockchainTab + MediaMigrationTab + MergeRequestsTab thanh sub-tabs

6. **`src/components/admin/FinanceDonationsTab.tsx`** (moi):
   - Gop FinancialTab + DonationHistoryAdminTab thanh sub-tabs

7. **Cac tab con (PplpMintTab, RewardApprovalTab, etc.)**:
   - Them logic `invalidateAdminData()` sau moi hanh dong ban/approve
   - PplpMintTab loc bo user da bi ban khoi danh sach "Top Users Cho Claim"

### 4. Dong bo Ban Status cu the

Khi `ban_user_permanently` duoc goi o bat ky tab nao:
1. Goi `queryClient.invalidateQueries({ queryKey: ['admin-users'] })`
2. Tat ca tab se tu dong re-fetch va loai bo user da bi ban
3. OverviewTab cap nhat so lieu thong ke theo thoi gian thuc
4. PplpMintTab tu dong loai user banned khoi ecosystem stats

### 5. Giao dien tabs moi

```text
[Tong quan] [PPLP Mint] [Tai chinh] [Duyet thuong] [Quan ly User] [Chong gian lan] [Duyet bai] [He thong]
```

8 tabs tren 1 dong, de doc va dieu huong hon 15 tabs hien tai.
