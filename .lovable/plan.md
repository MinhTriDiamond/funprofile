
# Kiem Tra Toan Bo Tinh Nang Reels va Huong Dan Mint FUN Money

## Phan 1: Ket Qua Kiem Tra Reels

### Da hoat dong tot (PASS)
- Trang `/reels` render dung, hien thi empty state "No reels yet" khi chua co du lieu
- Navbar hien thi tab Reels (icon Film) voi highlight khi active
- Route `/reels/:reelId` ho tro deep link voi auto-scroll den reel chi dinh
- ReelPlayer: autoplay/pause theo scroll, mute/unmute toggle
- ReelComments: Like comment ket noi voi `toggleCommentLike`, delete button hien cho chu comment
- FollowButton: Gui friend request qua bang `friendships`, hien thi trang thai Pending/Following
- CreateReelDialog: Upload video qua R2 presigned URL, chon visibility, nhap caption
- ShareReelDialog, DoubleTapLike, ReelInfo deu render dung
- Edge function `get-reel-recommendations`: Doc user tu JWT token, tra ve `is_liked`/`is_bookmarked` chinh xac

### Loi phat hien can sua

#### Loi 1: Edge function doc `limit`/`offset` tu query params nhung useReels gui qua POST body (QUAN TRONG)
- `get-reel-recommendations/index.ts` dong 20-21: `url.searchParams.get("limit")` va `url.searchParams.get("offset")`
- `useReels.ts` dong 63-65: `supabase.functions.invoke('get-reel-recommendations', { body: { limit, offset: 0 } })`
- Khi `supabase.functions.invoke` gui POST voi body, cac gia tri `limit`/`offset` nam trong body JSON, KHONG phai query params
- **Hau qua**: Edge function luon dung default `limit=10`, `offset=0` bat ke client gui gi

**Cach sua**: Trong edge function, doc body tu request khi method la POST:
```typescript
let limit = 10, offset = 0;
if (req.method === 'POST') {
  const body = await req.json().catch(() => ({}));
  limit = body.limit || 10;
  offset = body.offset || 0;
} else {
  limit = parseInt(url.searchParams.get("limit") || "10");
  offset = parseInt(url.searchParams.get("offset") || "0");
}
```

#### Loi 2: Comment like_count khong cap nhat trong database
- `useReelCommentInteractions.ts` toggle like/unlike nhung KHONG cap nhat truong `like_count` tren bang `reel_comments`
- Nut Like hien thi `comment.like_count` nhung gia tri nay khong bao gio thay doi

**Cach sua**: Them logic update `like_count` trong `toggleCommentLike` mutation, tuong tu cach `useReels` cap nhat `like_count` cho reels.

#### Loi 3: `useReels` khong invalidate `reel-comment-likes` sau khi like/unlike comment
- Khi user like comment, query `reel-comment-likes` trong `ReelComments.tsx` khong duoc refresh
- **Hau qua**: Trang thai visual cua nut Like comment co the khong dong bo

**Cach sua**: Them `queryClient.invalidateQueries({ queryKey: ['reel-comment-likes'] })` trong `toggleCommentLike.onSuccess`.

#### Loi 4: ReelPlayer khong xu ly loi video (video URL khong hop le)
- Hien tai `ReelPlayer.tsx` khong co `onError` handler cho the `<video>`
- Neu video URL bi loi, man hinh se den trang khong co thong bao gi

**Cach sua**: Them state `hasError` va hien thi fallback UI khi video khong load duoc.

---

## Phan 2: Ke Hoach Sua Loi

### File can chinh sua:

| STT | File | Thay doi |
|-----|------|----------|
| 1 | `supabase/functions/get-reel-recommendations/index.ts` | Doc limit/offset tu body khi POST |
| 2 | `src/hooks/useReelCommentInteractions.ts` | Cap nhat like_count + invalidate reel-comment-likes |
| 3 | `src/components/reels/ReelPlayer.tsx` | Them error handling cho video |

### Tong ket:
- **3 file can sua**
- **0 file moi**
- **0 thay doi database**

---

## Phan 3: Huong Dan Mint FUN Money Ve Vi

### Quy trinh tong quan

FUN Money duoc mint thong qua he thong **PPLP (Proof of Pure Love Protocol)** tren BSC Testnet. Quy trinh gom 5 buoc:

### Buoc 1: Tao Light Actions (Kiem diem)
Thuc hien cac hoat dong tren nen tang de tao "Light Actions":
- Dang bai viet (post): 100 FUN/bai
- Binh luan (comment): 20 FUN/comment
- React cam xuc (reaction): 10 FUN/reaction
- Chia se (share): 50 FUN/share
- Ket ban (friend): 20 FUN/ban
- Phat truc tiep (livestream): 200 FUN/phien

Moi action duoc ANGEL AI danh gia theo 5 cot tru: Chan that, Dong gop, Chua lanh, Phung su, Hop nhat.

### Buoc 2: Claim Light Actions
- Vao trang `/wallet` -> phan "Light Actions Cho Claim"
- Xem danh sach cac action da duoc phe duyet (approved)
- Nhan nut **"Claim [so] FUN"** de tao yeu cau mint
- He thong se goi edge function `pplp-mint-fun` de tao `mint_request` trong database

### Buoc 3: Admin Ky Duyet (EIP-712)
- Admin (nguoi giu vi Attester) vao tab **PPLP Mint** trong trang Admin
- Xem cac yeu cau mint co trang thai `pending_sig`
- Ky duyet bang vi MetaMask/RainbowKit (ky EIP-712 PureLoveProof)
- Co the ky don le hoac hang loat (batch)

### Buoc 4: Gui On-Chain (lockWithPPLP)
- Sau khi ky, Admin nhan **"Submit On-Chain"**
- He thong goi ham `lockWithPPLP` tren smart contract FUN Money (0x1aa8...5ff2)
- Token FUN duoc mint vao vi nguoi dung o trang thai **LOCKED**
- He thong tu dong theo doi transaction receipt va cap nhat trang thai `confirmed`

### Buoc 5: Activate va Claim ve vi
- **Activate**: Vao trang `/wallet` -> nhan **"Activate FUN"** de chuyen tu LOCKED sang ACTIVATED
- **Claim ve vi**: Nhan **"Claim FUN"** de rut tu ACTIVATED ve vi ca nhan (token tu do luu thong)
- Ca hai thao tac yeu cau ket noi vi MetaMask tren mang **BSC Testnet (Chain ID 97)** va co du phi gas tBNB

### Luu y quan trong:
- Gioi han hang ngay: 5,000 FUN/user
- Gioi han toan nen tang: 10,000,000 FUN/ngay
- Can co tBNB trong vi de tra phi gas cho cac giao dich on-chain
- Smart Contract: `0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2` (BSC Testnet)
- Vi Attester phai duoc dang ky tren contract qua `govRegisterAttester`
- Action type "light_action" phai duoc dang ky qua `govRegisterAction`
