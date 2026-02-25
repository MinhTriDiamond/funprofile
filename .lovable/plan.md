

# Hien thi link trong noi dung bai viet va tin nhan

## Van de
Hien tai, khi nguoi dung paste link vao bai viet hoac tin nhan, link chi hien thi nhu van ban thuong (khong the nhan vao duoc). Nguoi dung muon link luon duoc hien thi dang co the nhan vao (clickable) du co them chu ben canh.

## Giai phap

### 1. Tao utility function `linkifyText`
**File moi:** `src/utils/linkifyText.tsx`
- Tao ham nhan dien URL trong chuoi van ban (regex match `https?://...`)
- Tra ve mang React elements: phan text thuong va phan link (`<a>` tag)
- Link se co style mau xanh, gach chan, mo tab moi khi nhan

### 2. Cap nhat `ExpandableContent` (hien thi bai viet)
**File:** `src/components/feed/ExpandableContent.tsx`
- Thay vi render `{content}` truc tiep, goi `linkifyText(content)` 
- Dam bao link van hoat dong khi noi dung bi cat ngan (truncated)

### 3. Cap nhat `MessageBubble` (tin nhan chat)
**File:** `src/modules/chat/components/MessageBubble.tsx`
- Dong 222: thay `{message.content}` bang `linkifyText(message.content)`
- Link trong tin nhan se hien thi dang clickable

### 4. Cap nhat `CommentItem` (binh luan)
**File:** `src/components/feed/CommentItem.tsx`
- Ap dung `linkifyText` cho noi dung binh luan

## Chi tiet ky thuat

```text
linkifyText("Xem tai https://fun.rich/video abc")
      |
      v
[  "Xem tai ",
   <a href="https://fun.rich/video">https://fun.rich/video</a>,
   " abc"  ]
```

Regex su dung: `/(https?:\/\/[^\s<>"']+)/g`

Link se co style:
- Mau xanh (`text-primary`)  
- Gach chan khi hover (`hover:underline`)
- Mo tab moi (`target="_blank"`)
- Bao mat (`rel="noopener noreferrer"`)

