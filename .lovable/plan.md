
# Hien thi preview file dinh kem (PDF, ZIP, RAR, APK...) trong tin nhan chat

## Van de

Hien tai, `MessageBubble.tsx` trong module chat render **tat ca** URL dinh kem duoi dang the `<img>`. Khi nguoi dung gui file PDF, ZIP, RAR, APK... thi tin nhan hien thi mot anh bi loi (broken image) thay vi icon va ten file phu hop.

## Giai phap

### 1. Tao utility function phan loai file tu URL

Tao file `src/modules/chat/utils/fileUtils.ts` voi cac ham:
- `getFileTypeFromUrl(url)`: Tra ve loai file (`image`, `video`, `document`) dua tren phan mo rong trong URL
- `getFileExtension(url)`: Lay phan mo rong file (pdf, zip, rar, apk, docx...)
- `getFileIcon(ext)`: Tra ve ten Lucide icon tuong ung (FileText cho PDF/DOC, FileArchive cho ZIP/RAR, Smartphone cho APK...)
- `getFileName(url)`: Lay ten file tu URL (phan cuoi cua path, decode URI)

### 2. Tao component `FileAttachment`

Tao file `src/modules/chat/components/FileAttachment.tsx`:
- Hien thi mot the (card) nho voi: icon tuong ung loai file, ten file (truncate), phan mo rong / kich thuoc
- Bam vao se mo file trong tab moi (`window.open`)
- Style phu hop voi ca tin nhan cua minh (primary) va cua nguoi khac (muted)

### 3. Cap nhat `MessageBubble.tsx`

Thay khoi render media (dong 199-203) tu viec render tat ca la `<img>` sang:
- Neu URL la anh: giu nguyen render `<img>`
- Neu URL la video: render `<video>` voi controls
- Neu URL la file khac: render component `FileAttachment`

## Chi tiet ky thuat

| File | Thay doi |
|------|---------|
| `src/modules/chat/utils/fileUtils.ts` | Tao moi - utility phan loai file tu URL |
| `src/modules/chat/components/FileAttachment.tsx` | Tao moi - component hien thi file dinh kem |
| `src/modules/chat/components/MessageBubble.tsx` | Cap nhat khoi render media de phan biet anh/video/file |

### Mapping icon theo loai file

```text
PDF          -> FileText (do)
DOC/DOCX     -> FileText (xanh duong)
XLS/XLSX     -> FileSpreadsheet (xanh la)
TXT          -> FileText (xam)
ZIP/RAR/7Z   -> FileArchive (vang)
APK          -> Smartphone (xanh la)
Khac         -> File (xam)
```

### Giao dien FileAttachment

```text
+----------------------------------+
|  [Icon]  ten-file.pdf            |
|          PDF - Bam de mo         |
+----------------------------------+
```

- Bo goc tron, border nhe
- Hover: hien download icon hoac underline
- Chieu rong: min 200px, max 280px
