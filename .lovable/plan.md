

# Hoàn thiện CommentSection.tsx — 4 thay đổi

## 1. Fix Media Preview (dòng 238)
Thêm logic strip prefix `g:` / `s:` khi render `<img>`:
```tsx
<img 
  src={mediaUrl.startsWith('g:') || mediaUrl.startsWith('s:') ? mediaUrl.slice(2) : mediaUrl} 
  alt="Preview" 
  ...
/>
```

## 2. Try-catch cho 3 hàm async

**`fetchCurrentUser` (dòng 81-94):** Bọc toàn bộ body trong try-catch, catch chỉ console.error (không cần toast vì không critical).

**`fetchComments` (dòng 96-131):** Bọc toàn bộ body trong try-catch, catch hiện toast `cannotLoadComments`.

**`handleSubmit` (dòng 133-190):** Di chuyển `setLoading(true)` vào trước try block. Bọc logic từ `getUser()` đến cuối trong try-catch. Thêm `finally { setLoading(false); }` để nút gửi luôn được giải phóng.

## 3. Auto-scroll khi chọn GIF/Sticker (dòng 264-271)
Sau khi set `mediaUrl` trong `onGifSelect` và `onStickerSelect`, thêm `setTimeout(() => { ... scrollIntoView }, 100)` để cuộn nhẹ đến vùng preview:
```tsx
onGifSelect={(url) => {
  setMediaUrl(url);
  setMediaType('image');
  setTimeout(() => {
    document.querySelector('[data-media-preview]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}}
```
Thêm `data-media-preview` attribute vào div preview (dòng 236).

## 4. Haptic feedback khi gửi thành công (dòng 187)
Thêm `navigator.vibrate?.(10);` ngay sau `toast.success(t('commentPosted'))` trong block else của handleSubmit.

## Tổng kết: 1 file, 4 thay đổi
| Thay đổi | Vị trí |
|----------|--------|
| Strip prefix g:/s: trong preview | Dòng 238 |
| try-catch fetchCurrentUser | Dòng 81-94 |
| try-catch fetchComments | Dòng 96-131 |
| try-catch + finally handleSubmit | Dòng 133-190 |
| Auto-scroll sau chọn GIF/Sticker | Dòng 264-271 |
| Haptic vibrate khi gửi thành công | Dòng 187 |

