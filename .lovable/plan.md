
# Hien thi binh luan Live Chat trong bai dang Live Replay

## Van de

Khi xem lai bai dang Live Replay tren Feed, nguoi dung chi thay phan binh luan thuong (bang `comments`). Nhung tin nhan chat trong buoi Live duoc luu trong bang `live_messages` (lien ket qua `live_session_id`), va component `LiveChatReplay` da ton tai nhung **chua bao gio duoc hien thi** trong bai dang tren Feed.

Du lieu da duoc xac nhan: bang `live_messages` co 4 tin nhan, va moi bai dang live deu co `metadata.live_session_id`.

## Giai phap

Them phan **"Live Chat Replay"** vao `FacebookPostCard.tsx` cho cac bai dang co `post_type === 'live'`. Khi nguoi dung bam nut "Binh luan", ngoai phan binh luan thuong, se hien thi them khu vuc "Tin nhan trong buoi Live" phia tren.

## Chi tiet ky thuat

### Thay doi file: `src/components/feed/FacebookPostCard.tsx`

1. Import component `LiveChatReplay` tu `src/modules/live/components/LiveChatReplay.tsx`
2. Trong phan `showComments`, kiem tra neu `post.post_type === 'live'` va `post.metadata?.live_session_id` ton tai:
   - Hien thi `LiveChatReplay` voi `sessionId = metadata.live_session_id` trong mot khung co chieu cao co dinh (max-h-[300px])
   - Dat phia tren `CommentSection` de nguoi dung thay tin nhan live truoc, roi binh luan thuong ben duoi

### Khong can thay doi file khac

- `LiveChatReplay` da hoat dong dung: truy van `live_messages` theo `session_id`, hien thi voi avatar va ten nguoi dung
- Khong can migration database

## Cac file can thay doi

| File | Thay doi |
|------|---------|
| `src/components/feed/FacebookPostCard.tsx` | Import `LiveChatReplay`, hien thi khi post la live replay co `live_session_id` |
