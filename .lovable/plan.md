

# Tinh nang: Tu dong Post Card Chuc Mung len Feed + Hieu ung Am thanh & Phao hoa + Hold 15 phut

## Tong quan
Khi user gui tien thanh cong, he thong se tu dong tao bai post dac biet (type `gift_celebration`) tren Feed voi hieu ung am thanh RICH, confetti/phao hoa, va duoc pin o dau Feed trong 15 phut.

## Phan 1 - Database Migration

Them cac cot moi vao bang `posts`:

```text
posts (them cot):
  - post_type TEXT DEFAULT 'normal'        -- 'normal' | 'gift_celebration'
  - tx_hash TEXT                           -- hash giao dich blockchain
  - gift_sender_id UUID                    -- nguoi gui
  - gift_recipient_id UUID                 -- nguoi nhan
  - gift_token TEXT                        -- token symbol (CAMLY, BNB...)
  - gift_amount TEXT                       -- so luong
  - gift_message TEXT                      -- loi nhan
  - is_highlighted BOOLEAN DEFAULT false   -- pin tam thoi
  - highlight_expires_at TIMESTAMPTZ       -- het han pin
```

RLS: Gift celebration posts duoc tao boi edge function (service role), nen khong can them RLS rieng. Posts table da co RLS cho SELECT (public read).

## Phan 2 - Edge Function: record-donation (cap nhat)

Sau khi ghi donation thanh cong, them logic tao post gift_celebration:

1. Lay thong tin sender va recipient (username, avatar)
2. Tao noi dung post: `@sender da trao gui [AMOUNT] [TOKEN] cho @recipient`
3. Insert vao `posts` voi:
   - `post_type = 'gift_celebration'`
   - `is_highlighted = true`
   - `highlight_expires_at = NOW() + 15 phut`
   - `user_id = sender_id` (de post hien thi duoi ten nguoi gui)
   - `moderation_status = 'approved'` (khong can duyet)
   - Luu `tx_hash`, `gift_sender_id`, `gift_recipient_id`, `gift_token`, `gift_amount`, `gift_message`
4. Realtime channel hien tai da subscribe INSERT tren `posts` -> Feed tu dong cap nhat

## Phan 3 - Feed Query Logic (useFeedPosts.ts)

Cap nhat `fetchFeedPage` de sort highlighted posts len dau:

```text
Query strategy:
1. Fetch highlighted posts (is_highlighted = true AND highlight_expires_at > now())
   - ORDER BY created_at DESC
2. Fetch normal posts (cursor-based nhu hien tai)
3. Merge: highlighted posts + normal posts (loai bo trung lap)
```

Lazy update: Khi load feed, neu thay `highlight_expires_at < now()`, khong can update DB - chi xu ly bang dieu kien query.

Cap nhat `FeedPost` interface them cac field moi: `post_type`, `tx_hash`, `gift_sender_id`, `gift_recipient_id`, `gift_token`, `gift_amount`, `gift_message`, `is_highlighted`, `highlight_expires_at`.

## Phan 4 - Component: GiftCelebrationCard (moi)

Tao component `src/components/feed/GiftCelebrationCard.tsx`:

- Nen gradient tuoi sang (reuse CARD_THEMES tu GiftCelebrationModal)
- Hien thi avatar sender va recipient (2 avatar canh nhau)
- Dong chu chinh: `@sender da trao gui [AMOUNT] [TOKEN] cho @recipient`
- Loi nhan (trích toi da 120 ky tu, in nghieng)
- Thoi gian tuong doi (vua xong, 1 phut truoc...)
- Vien noi bat gradient + icon
- Nut "Xem giao dich" (link BscScan)
- Nut tha cam xuc va binh luan (reuse ReactionButton, CommentSection)
- Hieu ung sparkle CSS khi render lan dau (animation 2s)
- Badge "Highlighted" khi dang trong 15 phut pin

## Phan 5 - Hieu ung Am thanh & Animation

Khi GiftCelebrationCard render lan dau tren feed:

1. **Am thanh**: Phat file `rich-1.mp3` (10 giay, volume 0.3)
   - Chi phat 1 lan (dung `useRef` flag `hasPlayed`)
   - Khi scroll lai (IntersectionObserver), phat lai 5 giay
   - Ton trong mute setting (check localStorage `celebration_muted`)
   - Mobile Safari: Chi phat neu co user interaction gan nhat

2. **Confetti**: Su dung `canvas-confetti` (da co san)
   - Ban phao hoa nhe 1-2 giay khi card xuat hien
   - `zIndex: 9998` (khong che card)
   - Chi fire lan dau render

3. **Card animation**: 
   - `animate-fade-in` + `animate-scale-in` (da co san trong tailwind config)
   - Duration 0.5s

## Phan 6 - Feed.tsx cap nhat

Trong Feed.tsx, khi render posts:

```text
posts.map(post => {
  if (post.post_type === 'gift_celebration') {
    return <GiftCelebrationCard key={post.id} post={post} ... />
  }
  return <FacebookPostCard key={post.id} post={post} ... />
})
```

## Phan 7 - Xu ly nhieu giao dich lien tiep

- Moi giao dich tao 1 post rieng biet voi `highlight_expires_at` rieng
- Query sort: highlighted posts theo `created_at DESC` -> giao dich moi nhat len dau
- Khong gioi han so luong highlighted dong thoi
- Sau 15 phut, post tu dong tro thanh post binh thuong (query condition)

## Chi tiet ky thuat - Danh sach file can tao/sua

### File moi:
1. `src/components/feed/GiftCelebrationCard.tsx` - Card hien thi bai post chuc mung

### File sua:
1. **Database migration** - Them cot vao bang `posts`
2. `supabase/functions/record-donation/index.ts` - Them logic tao post gift_celebration
3. `src/hooks/useFeedPosts.ts` - Cap nhat query logic, FeedPost interface
4. `src/pages/Feed.tsx` - Render GiftCelebrationCard cho post type gift_celebration

### Thu tu thuc hien:
1. Database migration (them cot)
2. GiftCelebrationCard component
3. Cap nhat useFeedPosts.ts (interface + query)
4. Cap nhat Feed.tsx (render logic)
5. Cap nhat record-donation edge function
6. Test end-to-end

