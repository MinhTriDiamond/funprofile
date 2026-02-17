
# Kiểm tra toàn bộ hệ thống fun.rich - Báo cáo và sửa lỗi

## Tổng quan
Sau khi kiểm tra toàn bộ code, phát hiện **4 vấn đề** cần khắc phục:

---

## Vấn đề 1: Profile.tsx - Thiếu `display_name` trong query bài viết

**Mức độ:** Trung bình (hiển thị sai tên)

**Chi tiết:** Trong `src/pages/Profile.tsx`, dòng 155 và 171, query bài viết trên trang cá nhân select `profiles!posts_user_id_fkey (username, avatar_url, full_name, ...)` nhưng **thiếu `display_name`**. Trong khi `useFeedPosts.ts` (Bảng tin chính) đã có `display_name`, trang Profile lại không có. Kết quả: bài viết trên trang cá nhân hiển thị `username` thay vì tên hiển thị đẹp.

**Giải pháp:**
- Dòng 155: Thêm `display_name` vào select:
  `profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, external_wallet_address, custodial_wallet_address, public_wallet_address)`
- Dòng 171: Tương tự cho shared posts query
- Thêm `public_wallet_address` vào cả 2 query (cũng đang thiếu)

---

## Vấn đề 2: Profile.tsx - Thiếu `external_wallet_address` trong chuỗi ưu tiên hiển thị ví

**Mức độ:** Trung bình (hiển thị ví không đúng ưu tiên)

**Chi tiết:** Dòng 483, chuỗi fallback hiện tại là:
```
public_wallet_address || custodial_wallet_address
```
Nhưng theo chính sách ưu tiên ví, phải là:
```
public_wallet_address || external_wallet_address || custodial_wallet_address
```
Bỏ qua `external_wallet_address` khiến người dùng đã kết nối ví ngoài nhưng chưa set public wallet sẽ không thấy địa chỉ ví hiển thị.

**Giải pháp:** Dòng 483 sửa thành:
```typescript
const displayAddress = profile?.public_wallet_address || profile?.external_wallet_address || profile?.custodial_wallet_address;
```

---

## Vấn đề 3: Post.tsx - Thiếu `display_name` và `public_wallet_address` trong query

**Mức độ:** Trung bình

**Chi tiết:** File `src/pages/Post.tsx` dòng 40, query chi tiết bài viết cũng thiếu `display_name` và `public_wallet_address` trong select profiles.

**Giải pháp:** Dòng 40 sửa thành:
```
profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, external_wallet_address, custodial_wallet_address, public_wallet_address)
```

---

## Vấn đề 4: SocialLogin.tsx - Google OAuth redirect về domain Lovable thay vì fun.rich

**Mức độ:** Nghiêm trọng (ảnh hưởng trải nghiệm trên custom domain)

**Chi tiết:** Khi người dùng đăng nhập bằng Google trên `fun.rich`, Lovable auth-bridge chặn redirect và đưa về domain lovableproject.com thay vì quay lại fun.rich.

**Giải pháp:** Trong `src/components/auth/SocialLogin.tsx`, thêm logic phát hiện custom domain và dùng `skipBrowserRedirect: true` để tự quản lý redirect:

```typescript
const handleGoogleSignIn = async () => {
  setGoogleLoading(true);
  try {
    const isCustomDomain =
      !window.location.hostname.includes('lovable.app') &&
      !window.location.hostname.includes('lovableproject.com');

    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
          queryParams: { access_type: 'offline', prompt: 'consent select_account' },
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } else {
      // Trên domain Lovable, dùng flow bình thường
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: 'offline', prompt: 'consent select_account' },
        },
      });
      if (error) throw error;
    }
  } catch (error: any) {
    toast.error(error.message || t('authErrorGeneric'));
    setGoogleLoading(false);
  }
};
```

---

## Tổng kết các file cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/Profile.tsx` (dòng 155, 171, 483) | Thêm `display_name`, `public_wallet_address` vào query; sửa chuỗi ưu tiên ví |
| `src/pages/Post.tsx` (dòng 40) | Thêm `display_name`, `public_wallet_address` vào query |
| `src/components/auth/SocialLogin.tsx` (dòng 57-77) | Thêm logic custom domain cho Google OAuth |

## Ưu tiên thực hiện
1. **Vấn đề 4** (OAuth redirect) - Quan trọng nhất, ảnh hưởng đăng nhập trên fun.rich
2. **Vấn đề 1 & 3** (display_name) - Sửa hiển thị tên đúng trên Profile và Post
3. **Vấn đề 2** (wallet fallback) - Sửa chuỗi ưu tiên ví đầy đủ
