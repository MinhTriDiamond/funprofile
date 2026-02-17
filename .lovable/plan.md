


# Tự động đăng bài chúc mừng khi user rút thưởng (Claim Reward)

## Hiện trạng
- **Tặng quà (Donation)**: ĐÃ CÓ bài đăng tự động loại `gift_celebration` trên Feed - không cần thay đổi.
- **Rút thưởng (Claim Reward)**: CHƯA CÓ bài đăng tự động. Cần bổ sung.

## Thay đổi

### File: `supabase/functions/claim-reward/index.ts`
Thêm đoạn tạo bài đăng tự động sau bước 17b (notification), trước bước 18 (return):

- Tạo bài đăng loại `gift_celebration` với nội dung: "🎉 @username đã nhận thưởng [số lượng] CAMLY từ FUN Profile Treasury! ❤️"
- Ghim bài đăng (highlight) trong 15 phút
- Visibility: public, moderation: approved
- Sử dụng `TREASURY_SENDER_ID` làm `gift_sender_id` và `userId` làm `gift_recipient_id`

### Chi tiết kỹ thuật

Thêm khoảng 20 dòng code vào `claim-reward/index.ts` (sau dòng 666, trước dòng 668):

```typescript
// 17c. Tạo bài đăng chúc mừng trên Feed
try {
  const claimUsername = profile.username || profile.full_name || 'Người dùng';
  const celebrationContent = `🎉 @${claimUsername} đã nhận thưởng ${effectiveAmount.toLocaleString()} CAMLY từ FUN Profile Treasury! ❤️`;

  await supabaseAdmin.from('posts').insert({
    user_id: userId,
    content: celebrationContent,
    post_type: 'gift_celebration',
    tx_hash: txHash,
    gift_sender_id: TREASURY_SENDER_ID,
    gift_recipient_id: userId,
    gift_token: 'CAMLY',
    gift_amount: effectiveAmount.toString(),
    gift_message: `Claim ${effectiveAmount.toLocaleString()} CAMLY`,
    is_highlighted: true,
    highlight_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    visibility: 'public',
    moderation_status: 'approved',
  });
} catch (postError) {
  console.error('Không thể tạo bài đăng chúc mừng (non-blocking):', postError);
}
```

## Tổng kết
- Chỉ cần sửa **1 file**: `supabase/functions/claim-reward/index.ts`
- Bài đăng sẽ hiển thị giống hệt bài tặng quà: card gradient xanh lá, avatar người gửi (Treasury) và người nhận, hiệu ứng RICH, pháo hoa
- Bài đăng được ghim 15 phút đầu Feed
- Lỗi tạo bài đăng không ảnh hưởng đến quy trình rút thưởng (non-blocking)
