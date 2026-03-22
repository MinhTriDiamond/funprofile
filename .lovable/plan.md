

## Vấn đề

Khi `auto-scan-donations` tạo post `gift_celebration` cho ví ngoài, nó **không truyền `metadata`** vào post. Trong khi `GiftCelebrationCard` kiểm tra `post.metadata?.is_external === true` để hiển thị địa chỉ ví ngoài thay vì avatar người gửi.

Kết quả: Card hiển thị `post.profiles` (= người nhận, vì `user_id = recipientId`) → hiển thị sai: "Angel Ái Vân tặng Angel Ái Vân".

## Sửa lỗi

### File: `supabase/functions/auto-scan-donations/index.ts`

Thêm trường `metadata` vào object post khi insert (dòng 261-278):

```typescript
postsToInsert.push({
  // ... existing fields ...
  metadata: isExternal ? {
    is_external: true,
    sender_address: d.sender_address,
    sender_name: (d.metadata as Record<string, unknown>)?.sender_name || senderName,
  } : null,
});
```

Chỉ cần thêm 1 trường `metadata` — frontend đã có sẵn logic hiển thị đúng cho external gift (địa chỉ ví rút gọn, icon 🌐, link BscScan).

### Dữ liệu cũ

Post hiện tại của angelaivan (tx `0x17fa457e...`) cũng cần được cập nhật metadata để hiển thị đúng ngay lập tức.

