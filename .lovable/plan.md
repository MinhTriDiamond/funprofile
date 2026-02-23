

# Fix Live Stream White Screen (Lần 2)

## Nguyên Nhân Gốc

Bản fix trước đã chuyển `createLiveSession()` vào onClick - đúng. Nhưng vấn đề chính vẫn chưa được giải quyết:

**`AgoraRTC.createMicrophoneAndCameraTracks()`** vẫn đang được gọi trong `useEffect` (LiveHostPage dòng 216-256), KHÔNG phải trong user gesture context. Trên mobile browser (đặc biệt Safari, Chrome mobile), `getUserMedia` gọi từ useEffect sẽ bị chặn hoặc fail âm thầm -> màn hình trắng/loading vô hạn.

Thêm vào đó, PreLivePage **dừng tất cả camera tracks** trước khi navigate, nên permission có thể bị reset trên một số browser.

## Giải Pháp

### 1. LiveHostPage: Thêm nút "Bắt đầu phát" thay vì auto-start
File: `src/modules/live/pages/LiveHostPage.tsx`

Thay vì tự động gọi `start()` trong useEffect khi session load xong, hiển thị một nút **"Bắt đầu phát sóng"** để user bấm. Khi user bấm nút đó, `start()` được gọi trong onClick handler (user gesture context), đảm bảo `getUserMedia` / Agora tracks được cấp phép.

Cụ thể:
- Bỏ useEffect tự động start Agora (dòng 216-256)
- Thêm state `needsManualStart` 
- Khi bootState = 'ready' và chưa start, hiện UI với nút "Bắt đầu phát sóng"
- onClick nút đó gọi `start()` trực tiếp -> Agora tracks được tạo trong user gesture context
- Sau khi start thành công, bắt đầu recording như cũ

### 2. PreLivePage: Không dừng camera tracks trước khi navigate
File: `src/modules/live/pages/PreLivePage.tsx`

Giữ camera stream chạy khi navigate để browser không reset permission. LiveHostPage/Agora sẽ tự request tracks mới, và tracks cũ sẽ tự bị GC khi component unmount.

### 3. StartLiveDialog: Cập nhật navigation path
File: `src/modules/live/components/StartLiveDialog.tsx`

Sửa `/live/new` thành `/live/setup` để flow đi đúng qua PreLivePage trước.

## Flow Mới

```text
PreLivePage (camera preview, KHÔNG dừng tracks)
    |
    v  [User bấm "Phát trực tiếp"] -- user gesture
    |
    ├── createLiveSession() 
    ├── Navigate tới /live/{sessionId}/host
    |
    v
LiveHostPage
    |
    ├── Load session data (bootState → ready)
    ├── Hiện nút "Bắt đầu phát sóng" 
    |
    v  [User bấm nút] -- user gesture  
    |
    ├── start() → AgoraRTC.createMicrophoneAndCameraTracks() ← trong user gesture context
    ├── Join channel, publish tracks
    └── Bắt đầu recording
```

## Các file thay đổi
1. `src/modules/live/pages/LiveHostPage.tsx` - Thêm nút manual start thay vì auto-start useEffect
2. `src/modules/live/pages/PreLivePage.tsx` - Không dừng tracks trước khi navigate
3. `src/modules/live/components/StartLiveDialog.tsx` - Fix navigation path

