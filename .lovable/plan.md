

## Sua loi: Bo kiem tra bai trung noi dung voi tai khoan khac khi Claim

### Van de

Khi nguoi dung claim CAMLY, he thong kiem tra bai viet trong ngay co trung noi dung voi tai khoan khac khong (lines 255-278 trong `claim-reward/index.ts`). Neu trung -> tu dong chuyen trang thai `on_hold` va chan claim.

Tuy nhien, theo quy tac da thiet lap: **chi chan bai trung cua CUNG mot nguoi dung** (30 ngay). Nguoi dung khac nhau duoc phep dang cung noi dung.

### Giai phap

Xoa doan kiem tra "duplicate posts today cross-user" (lines 255-278) trong Edge Function `claim-reward/index.ts`. Cu the:

- Xoa toan bo block code tu dong `// Check duplicate posts today` den het vong lap `for`.
- Giu nguyen cac kiem tra fraud khac (device_hash, avatar trung, vi trung, ten ao...).

### Chi tiet ky thuat

File: `supabase/functions/claim-reward/index.ts`

Xoa doan code sau (lines 255-278):

```typescript
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
      fraudReasons.push('Bai viet trong ngay trung noi dung voi tai khoan khac');
      break;
    }
  }
}
```

Sau khi deploy, nguoi dung se khong bi chan claim chi vi bai viet trung noi dung voi nguoi khac nua. Viec loc bai trung lap van duoc xu ly rieng o tang `create-post` (chi ap dung trong cung 1 user, 30 ngay).

