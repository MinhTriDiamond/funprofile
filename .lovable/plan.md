
## Thêm điều kiện kiểm tra hồ sơ trước khi cho phép Claim CAMLY

### Yêu cầu
Người dùng phải hoàn thành đầy đủ các bước sau mới được phép claim:
1. Có ảnh đại diện (avatar_url) -- hình người thật
2. Có ảnh bìa (cover_url)
3. Đã đăng ít nhất 1 bài trong ngày hôm nay
4. Có địa chỉ ví công khai hợp lệ (đã có sẵn)

Khi thiếu bất kỳ điều kiện nào, hiển thị thông báo cụ thể hướng dẫn người dùng.

### Thay đổi

#### 1. Edge Function: `supabase/functions/claim-reward/index.ts`
- Thêm `cover_url` vào truy vấn profile (dòng 125)
- Thêm kiểm tra `cover_url` -- nếu thiếu, trả về lỗi 403 với thông báo hướng dẫn
- Thêm truy vấn kiểm tra bài đăng trong ngày (bảng `posts`, lọc theo `user_id` và `created_at >= đầu ngày UTC`)
- Nếu chưa đăng bài trong ngày, trả về lỗi 403 kèm hướng dẫn

#### 2. Frontend: `src/components/wallet/ClaimRewardsSection.tsx`
- Nhận thêm props: `hasAvatar`, `hasCover`, `hasTodayPost`
- Hiển thị danh sách checklist trước nút Claim với trạng thái xanh/đỏ cho từng điều kiện:
  - Ảnh đại diện (hình người thật)
  - Ảnh bìa trang cá nhân
  - Đăng ít nhất 1 bài hôm nay
  - Ví đã kết nối
- Vô hiệu hóa nút Claim nếu bất kỳ điều kiện nào chưa đạt

#### 3. Parent component (trang Wallet)
- Truy vấn thêm `cover_url` từ profile
- Truy vấn đếm bài đăng trong ngày (`posts` where `user_id = currentUser` and `created_at >= today`)
- Truyền các giá trị `hasAvatar`, `hasCover`, `hasTodayPost` xuống `ClaimRewardsSection`

### Chi tiết kỹ thuật

**Edge Function -- claim-reward/index.ts:**
```typescript
// Mở rộng select profile
.select('reward_status, username, avatar_url, cover_url, public_wallet_address')

// Kiểm tra cover_url
if (!profile.cover_url) {
  return new Response(JSON.stringify({
    error: 'Incomplete Profile',
    message: 'Vui lòng cập nhật ảnh bìa trong trang cá nhân trước khi claim',
    missing: ['cover_url']
  }), { status: 403, ... });
}

// Kiểm tra bài đăng hôm nay
const todayStart = new Date();
todayStart.setUTCHours(0, 0, 0, 0);
const { count } = await supabase
  .from('posts')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', todayStart.toISOString());

if (!count || count === 0) {
  return new Response(JSON.stringify({
    error: 'Activity Required',
    message: 'Bạn cần đăng ít nhất 1 bài viết hôm nay để được claim. Hãy chia sẻ một bài viết trên trang cá nhân của bạn!',
    missing: ['today_post']
  }), { status: 403, ... });
}
```

**Frontend -- ClaimRewardsSection.tsx:**
Thêm checklist hiển thị rõ ràng các điều kiện cần hoàn thành, ví dụ:
```
Điều kiện claim:
[x] Ảnh đại diện (hình người thật)     -- xanh
[ ] Ảnh bìa trang cá nhân              -- đỏ, kèm link "Cập nhật ngay"
[x] Đăng ít nhất 1 bài hôm nay         -- xanh
[x] Ví đã kết nối                      -- xanh
```

Nếu thiếu điều kiện, nút Claim bị vô hiệu hóa và hiển thị hướng dẫn cụ thể cho từng mục thiếu.
