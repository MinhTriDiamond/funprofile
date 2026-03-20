

## Vấn đề

File `dialog.tsx` dòng 43 có class `sm:max-w-lg` (512px) hardcode trong base styles của `DialogContent`. Class này có độ ưu tiên CSS ngang bằng với `w-[905px]` từ `NewMembersModal`, nhưng `max-width` luôn giới hạn `width`, nên modal bị giới hạn ở 512px.

## Giải pháp

Thêm `sm:max-w-[905px]` vào className của `DialogContent` trong `NewMembersModal.tsx` để override `sm:max-w-lg` từ base dialog.

### File: `src/components/feed/NewMembersModal.tsx` (dòng 80)

Thay đổi className từ:
```
w-[905px] max-w-[95vw] max-h-[90vh]
```
thành:
```
w-[905px] max-w-[95vw] sm:max-w-[905px] max-h-[90vh]
```

Chỉ cần thêm `sm:max-w-[905px]` để override `sm:max-w-lg` từ dialog base. Một thay đổi nhỏ, một dòng duy nhất.

