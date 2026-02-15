

## Phat hien bai viet "dang cho co" va pending cho Admin duyet

### Tong quan
Them co che tu dong phat hien cac bai viet chat luong thap (dang cho co, spam) va chuyen sang trang thai `pending_review` de Admin kiem duyet truoc khi hien thi tren newsfeed.

### Tieu chi phat hien bai viet "dang cho co"

1. **Noi dung qua ngan** -- duoi 15 ky tu VA khong co media (anh/video)
2. **Chi co emoji/ky tu dac biet** -- khong co chu cai thuc su
3. **Noi dung la chuoi vo nghia** -- vi du: "aaa", "...", "123", "test", "abc"
4. **Noi dung lap lai ky tu** -- vi du: "aaaaaaa", "hahahaha" (1-2 ky tu lap > 5 lan)

Bai viet co media (anh/video) se KHONG bi danh dau spam du noi dung ngan, vi nguoi dung co the dang anh kem caption ngan.

### Thay doi can thuc hien

#### 1. Migration: Them cot `moderation_status` vao bang `posts`

```sql
ALTER TABLE posts ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved';
CREATE INDEX idx_posts_moderation ON posts(moderation_status) WHERE moderation_status = 'pending_review';
```

Gia tri: `'approved'` (mac dinh), `'pending_review'`, `'rejected'`

#### 2. Cap nhat Edge Function `create-post/index.ts`

Them ham `detectLowQuality(content, mediaCount)` tra ve `boolean`:
- Kiem tra do dai noi dung (< 15 ky tu va khong co media)
- Kiem tra chi emoji (regex loai bo emoji, con lai rong)
- Kiem tra chuoi vo nghia (regex phat hien lap ky tu)
- Kiem tra tu khoa spam phho bien ("test", "abc", "aaa", "...")

Neu `detectLowQuality` tra ve `true`:
- Set `moderation_status = 'pending_review'` khi insert
- Tra ve `moderation_status: 'pending_review'` trong response
- Van cho phep dang (khong block) nhung khong hien thi tren feed

#### 3. Cap nhat Feed query (`useFeedPosts.ts`)

Them filter `.eq('moderation_status', 'approved')` vao query fetch posts de chi hien bai viet da duoc duyet.

Luu y: Bai viet cua chinh user do van hien thi cho ho (de ho khong biet bi pending).

#### 4. Cap nhat `FacebookCreatePost.tsx`

Khi response tra ve `moderation_status: 'pending_review'`:
- Hien toast thong bao nhe: "Bai viet cua ban dang duoc xem xet"
- Khong chay PPLP evaluate cho bai viet pending

#### 5. Them tab Admin "Duyet bai viet" (`PostModerationTab.tsx`)

Tab moi trong Admin Dashboard hien thi:
- Danh sach bai viet co `moderation_status = 'pending_review'`
- Thong tin: ten user, noi dung bai, thoi gian dang
- 2 nut: "Duyet" (chuyen sang `approved`) va "Tu choi" (chuyen sang `rejected`)
- So luong bai cho duyet hien o tab header

#### 6. Cap nhat `Admin.tsx`

Them tab "Duyet bai" vao TabsList voi icon va label tuong ung.

### Chi tiet ky thuat

**Ham `detectLowQuality` trong create-post:**
```text
function detectLowQuality(content: string, mediaCount: number): boolean {
  // Co media → khong phai spam
  if (mediaCount > 0) return false;
  
  const trimmed = content.trim();
  
  // Qua ngan (< 15 ky tu, khong media)
  if (trimmed.length < 15) return true;
  
  // Chi emoji/ky tu dac biet, khong co chu
  const textOnly = trimmed.replace(/[\p{Emoji}\s\p{P}\p{S}]/gu, '');
  if (textOnly.length === 0) return true;
  
  // Lap ky tu vo nghia: "aaaa", "hahaha"
  const deduped = trimmed.replace(/(.)\1{4,}/g, '$1');
  if (deduped.length <= 3) return true;
  
  return false;
}
```

**Feed query filter:**
```typescript
// useFeedPosts.ts
let query = supabase
  .from('posts')
  .select(...)
  .or(`moderation_status.eq.approved,user_id.eq.${currentUserId}`)
  .order('created_at', { ascending: false });
```

Dieu nay dam bao: bai viet da duyet hien cho tat ca, bai viet pending chi hien cho chinh nguoi dang.

**PostModerationTab component:**
- Query `posts` WHERE `moderation_status = 'pending_review'` ORDER BY `created_at DESC`
- Join `profiles` de lay username, avatar
- Admin update `moderation_status` bang client supabase (RLS cho phep admin update)

**RLS bo sung:**
```sql
-- Admin co the update moderation_status
CREATE POLICY "Admins can update post moderation"
ON posts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
```

### Ket qua
- Bai viet "dang cho co" tu dong bi giữ lai cho admin duyet
- User van thay bai viet cua minh (khong biet bi pending) 
- Admin co tab rieng de duyet/tu choi bai viet
- Bai viet co anh/video khong bi anh huong
- Khong anh huong den PPLP reward (bai pending khong duoc evaluate)

