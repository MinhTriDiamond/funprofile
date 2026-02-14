

## Phát hiện lạm dụng tự động và tạm dừng claim

### Tổng quan
Thêm hệ thống tự động phát hiện các dấu hiệu lạm dụng (multi-account, avatar trùng, ví trùng, bài đăng trùng) ngay tại thời điểm claim. Nếu phát hiện bất thường, hệ thống sẽ tự động chuyển `reward_status` sang `on_hold` và yêu cầu admin duyệt thủ công.

### Các dấu hiệu phát hiện

1. **Nhiều tài khoản trên 1 thiết bị**: Kiểm tra bảng `pplp_device_registry` xem `device_hash` của user có được dùng bởi >1 user khác không
2. **Avatar trùng lặp**: So sánh `avatar_url` của user với các user khác (cùng URL = cùng ảnh)
3. **Ví trùng lặp**: Kiểm tra `public_wallet_address` có trùng với user khác không
4. **Bài đăng giống nhau trong ngày**: Kiểm tra bảng `posts` xem user có bài nào trùng `content` với user khác trong ngày không

### Thay doi

#### 1. Edge Function: `supabase/functions/claim-reward/index.ts`

Thêm bước kiểm tra lạm dung (sau bước 7d, trước bước 8) gồm 4 loại:

```
Bước 7e: Fraud auto-detection
- Query pplp_device_registry: nếu device_hash trùng >1 user -> flag
- Query profiles: nếu avatar_url trùng user khác -> flag
- Query profiles: nếu public_wallet_address trùng user khác -> flag
- Query posts: nếu content bài hôm nay trùng với user khác -> flag

Nếu có bất kỳ flag nào:
  1. Cập nhật profiles.reward_status = 'on_hold', admin_notes = lý do chi tiết
  2. Ghi vào pplp_fraud_signals
  3. Trả về 403 kèm thông báo rõ ràng cho người dùng
```

Thong bao tra ve cho nguoi dung se gom:
- Ly do cu the (VD: "Phat hien dia chi vi dung chung voi tai khoan khac")
- Huong dan: "Vui long lien he Admin de duoc xem xet"

#### 2. Frontend: `src/components/wallet/ClaimRewardsSection.tsx`

- Khi `rewardStatus === 'on_hold'`, hien thi `adminNotes` (ly do bi tam dung) trong 1 alert box mau cam ben duoi checklist
- Hien thi ro rang cac buoc nguoi dung can lam de giai quyet

#### 3. Frontend: `src/components/wallet/WalletCenterContainer.tsx`

- Them `admin_notes` vao profile select query (da co san)
- Truyen `adminNotes` xuong ClaimRewardsSection (da co san)

### Chi tiet ky thuat

**Edge Function - claim-reward/index.ts (buoc 7e):**

```typescript
// 7e. Auto fraud detection
const fraudReasons: string[] = [];

// Check shared device
const { data: userDevices } = await supabaseAdmin
  .from('pplp_device_registry')
  .select('device_hash')
  .eq('user_id', userId);

if (userDevices && userDevices.length > 0) {
  for (const dev of userDevices) {
    const { count } = await supabaseAdmin
      .from('pplp_device_registry')
      .select('user_id', { count: 'exact', head: true })
      .eq('device_hash', dev.device_hash)
      .neq('user_id', userId);
    if (count && count > 0) {
      fraudReasons.push('Phát hiện nhiều tài khoản trên cùng 1 thiết bị');
      break;
    }
  }
}

// Check duplicate avatar
if (profile.avatar_url) {
  const { count: avatarDups } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('avatar_url', profile.avatar_url)
    .neq('id', userId);
  if (avatarDups && avatarDups > 0) {
    fraudReasons.push('Ảnh đại diện trùng với tài khoản khác');
  }
}

// Check duplicate wallet
if (profile.public_wallet_address) {
  const { count: walletDups } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('public_wallet_address', profile.public_wallet_address)
    .neq('id', userId);
  if (walletDups && walletDups > 0) {
    fraudReasons.push('Địa chỉ ví trùng với tài khoản khác');
  }
}

// Check duplicate posts today
const { data: userPosts } = await supabaseAdmin
  .from('posts')
  .select('content')
  .eq('user_id', userId)
  .gte('created_at', postTodayStart.toISOString())
  .not('content', 'is', null)
  .limit(10);

if (userPosts && userPosts.length > 0) {
  for (const post of userPosts) {
    if (!post.content || post.content.trim().length < 20) continue;
    const { count: dupPosts } = await supabaseAdmin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('content', post.content)
      .neq('user_id', userId)
      .gte('created_at', postTodayStart.toISOString());
    if (dupPosts && dupPosts > 0) {
      fraudReasons.push('Bài viết trong ngày trùng nội dung với tài khoản khác');
      break;
    }
  }
}

// If fraud detected -> hold + return 403
if (fraudReasons.length > 0) {
  const holdNote = fraudReasons.join('; ');
  
  await supabaseAdmin.from('profiles').update({
    reward_status: 'on_hold',
    admin_notes: holdNote,
  }).eq('id', userId);

  await supabaseAdmin.from('pplp_fraud_signals').insert({
    actor_id: userId,
    signal_type: 'AUTO_HOLD',
    severity: 3,
    details: { reasons: fraudReasons },
    source: 'claim-reward',
  });

  return new Response(JSON.stringify({
    error: 'Account Held',
    message: `Tài khoản tạm dừng rút tiền do: ${holdNote}. Vui lòng liên hệ Admin để được xem xét.`,
    reasons: fraudReasons,
  }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

**Frontend - ClaimRewardsSection.tsx:**

Them alert box khi `rewardStatus === 'on_hold'` va co `adminNotes`:

```tsx
{rewardStatus === 'on_hold' && adminNotes && (
  <div className="bg-orange-50 border border-orange-300 rounded-xl p-3.5">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-orange-800">Tài khoản đang bị tạm dừng rút tiền</p>
        <p className="text-xs text-orange-700 mt-1">{adminNotes}</p>
        <p className="text-xs text-orange-600 mt-2">
          Vui lòng liên hệ Admin qua tin nhắn hoặc email để được xem xét và mở khoá.
        </p>
      </div>
    </div>
  </div>
)}
```

### Ket qua

- Khi user co dau hieu lam dung nhan Claim -> he thong tu dong chuyen `reward_status = 'on_hold'` va ghi ly do vao `admin_notes`
- User se thay thong bao ro rang ly do bi tam dung va huong dan lien he Admin
- Admin co the xem xet trong tab "Duyet thuong" va quyet dinh mo khoa hoac tu choi
- Ghi log vao `pplp_fraud_signals` de theo doi lich su

