

# Khoi phuc 5 video livestream mo coi va xu ly 37 posts live khong co recording

## Tong quan tinh hinh

### 5 sessions mo coi (co recording `done`, khong co `post_id`)

| # | Username | Session ID | Recording chunks | Output URL |
|---|----------|-----------|-----------------|------------|
| 1 | thuhuyen | 4ace544e... | 578 chunks | manifest.json |
| 2 | angelthuongchieu | b25d7fd0... | 5 chunks | manifest.json |
| 3 | Angellam | 060cf1a4... | 5 chunks | manifest.json |
| 4 | angelthanhtien | f5a93e36... | 42 chunks | manifest.json |
| 5 | angelquangvu | ffff7e4a... | 3 chunks | manifest.json |

### 37 posts live khong co video_url
- Phan lon co `recording_status = 'idle'` hoac khong co chunked_recording nao
- Nghia la recording chua bao gio bat dau hoac da that bai
- Khong co du lieu video de khoi phuc

## Ke hoach thuc hien

### Buoc 1: Tao edge function `recover-orphan-livestreams`

Tao mot edge function chay 1 lan (one-shot) de:

**A) Khoi phuc 5 session mo coi:**
- Voi moi session co `post_id IS NULL` va `chunked_recordings.status = 'done'`:
  1. Tao post moi trong bang `posts` voi:
     - `user_id` = session.host_user_id
     - `content` = session.title hoac "Phat lai livestream"
     - `post_type` = 'live'
     - `video_url` = recording.output_url (manifest.json URL)
     - `visibility` = 'public'
     - `created_at` = session.started_at (de hien dung vi tri thoi gian)
     - `metadata` = `{ live_title, live_status: 'ended', channel_name, agora_channel, live_session_id, playback_url, ended_at }`
  2. Cap nhat `live_sessions.post_id` = post.id moi tao

**B) Cap nhat 37 posts khong co recording:**
- Voi moi post co `post_type = 'live'` va `video_url IS NULL`:
  - Kiem tra co chunked_recording `status = 'done'` lien ket khong
  - Neu co: cap nhat `video_url` = recording.output_url
  - Neu khong co: cap nhat `metadata` them truong `recording_failed: true` de UI biet hien thi thong bao phu hop

### Buoc 2: Cap nhat UI trong `FacebookPostCard.tsx`

- Khi `post_type = 'live'` va `metadata.recording_failed = true`:
  - Hien thi thong bao "Phien live nay khong co ban ghi" thay vi placeholder "Dang xu ly..."
  - Van giu post hien thi (khong an)

### Buoc 3: Goi edge function 1 lan de chay recovery

- Deploy va curl edge function de thuc hien khoi phuc
- Kiem tra ket qua tra ve (so post tao, so post cap nhat)

## Chi tiet ky thuat

### Edge function `recover-orphan-livestreams/index.ts`

```text
Logic:
1. Query live_sessions WHERE post_id IS NULL
   JOIN chunked_recordings WHERE status = 'done'
2. Cho moi row: INSERT posts, UPDATE live_sessions.post_id
3. Query posts WHERE post_type = 'live' AND video_url IS NULL
   LEFT JOIN live_sessions -> chunked_recordings
4. Neu co recording done: UPDATE posts.video_url
5. Neu khong co: UPDATE posts.metadata jsonb_set recording_failed = true
6. Return summary JSON
```

Su dung supabase service role key de bypass RLS.

### FacebookPostCard.tsx thay doi

```text
// Trong phan render live post:
// Thay vi chi kiem tra metadata?.live_status === 'ended' && mediaItems.length === 0
// Them kiem tra metadata?.recording_failed === true
// => Hien thi "Phien live nay khong co ban ghi" (thay vi "Dang xu ly...")
```

## Ket qua ky vong

- 5 video livestream cua thuhuyen, angelthuongchieu, Angellam, angelthanhtien, angelquangvu duoc khoi phuc va hien thi trong feed voi player chuan
- 37 posts live khong co recording se hien thi thong bao ro rang thay vi placeholder misleading
- Khong anh huong den cac post/video khac

