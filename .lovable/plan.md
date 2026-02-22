

# Nang cap giao dien dinh kem file kieu Telegram

## Tong quan

Khi nguoi dung chon file dinh kem, thay vi hien thi preview nho (16x16) trong khung chat, he thong se hien thi mot **dialog/modal xem truoc** toan man hinh voi:
- Preview lon cho anh/video, icon cho file tai lieu
- O nhap **Caption** (noi dung di kem)
- Cac nut: **Them file** / **Huy** / **Gui**
- Nut xoa tung file

## Giao dien moi (tham khao Telegram)

```text
+---------------------------------------+
|  Gui file dinh kem              [X]   |
+---------------------------------------+
|                                       |
|   [Preview anh/video lon]      [Xoa]  |
|   hoac [Icon file + ten file]         |
|                                       |
|   Caption                             |
|   [___________________________] [:-)] |
|                                       |
|   [+ Them]       [Huy]       [Gui]    |
+---------------------------------------+
```

## Chi tiet ky thuat

### 1. Tao component `AttachmentPreviewDialog`

File: `src/modules/chat/components/AttachmentPreviewDialog.tsx`

- Su dung Radix Dialog (da co san)
- Props:
  - `open`: boolean
  - `files`: File[] - danh sach file da chon
  - `onClose`: () => void - dong dialog
  - `onSend`: (caption: string) => void - gui voi caption
  - `onAddMore`: () => void - mo file picker them
  - `onRemoveFile`: (index: number) => void - xoa 1 file
- Hien thi:
  - Tieu de "Gui file dinh kem" voi nut dong
  - Carousel/grid preview cac file (toi da 4)
    - Anh: hien thi `<img>` voi object-cover, rounded
    - Video: hien thi `<video>` voi play icon overlay
    - File khac: hien thi icon tuong ung (tu `getFileIconInfo`) + ten file + dung luong
  - Nut xoa (thung rac) tren moi file
  - O nhap Caption voi emoji picker
  - 3 nut hanh dong: Them / Huy / Gui

### 2. Cap nhat `ChatInput.tsx`

- Them state `showAttachPreview` (boolean)
- Khi nguoi dung chon file (`handleFileSelect`):
  - Van luu file vao `mediaFiles` nhu cu
  - Tu dong mo `AttachmentPreviewDialog` (`showAttachPreview = true`)
- Bo khoi preview nho cu (dong 194-233) - thay bang dialog moi
- Khi nguoi dung bam "Gui" trong dialog:
  - Lay caption tu dialog
  - Thuc hien upload + gui tin nhan voi `content = caption`
- Khi bam "Huy": xoa mediaFiles, dong dialog
- Khi bam "Them": goi `fileInputRef.current?.click()` de chon them file

### 3. Khong can thay doi backend

- `onSend(content, mediaUrls)` da ho tro gui caption (content) kem media
- Khong can sua database hay edge function

## Cac file can thay doi

| File | Thay doi |
|------|---------|
| `src/modules/chat/components/AttachmentPreviewDialog.tsx` | Tao moi - dialog xem truoc file kieu Telegram |
| `src/modules/chat/components/ChatInput.tsx` | Cap nhat: mo dialog khi chon file, bo preview nho cu |

