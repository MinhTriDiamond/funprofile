
# Fix Live Stream White Screen

## Root Cause
Khi người dùng bấm "Phát trực tiếp" trên PreLivePage, flow hiện tại:
1. PreLivePage dừng camera preview, navigate tới `/live/new`
2. LiveHostPage mount -> gọi `createLiveSession()` trong useEffect (không phải user gesture)
3. Sau khi tạo session, gọi `AgoraRTC.createMicrophoneAndCameraTracks()` cũng trong useEffect

Vấn đề: trình duyệt yêu cầu `getUserMedia` / Agora camera phải được gọi trực tiếp từ user click. Khi gọi trong useEffect, security context bị mất, dẫn đến lỗi không hiển thị và màn hình trắng.

## Giải pháp

### 1. Sửa PreLivePage - Tạo session NGAY khi user bấm nút
File: `src/modules/live/pages/PreLivePage.tsx`

- Khi bấm "Phát trực tiếp", gọi `createLiveSession()` NGAY trong `onClick` handler (user gesture context)
- Navigate tới `/live/{sessionId}/host` sau khi tạo thành công
- Hiện loading state trên nút trong lúc tạo session

### 2. Sửa LiveHostPage - Bỏ tự động tạo session khi vào /live/new
File: `src/modules/live/pages/LiveHostPage.tsx`

- Nếu vào `/live/new` mà không có `liveSessionId` param VÀ không có `createdSessionId`, redirect về `/live/setup`
- Bỏ logic `createLiveSession` trong `runBootstrap` (chuyển sang PreLivePage)
- Giữ lại flow khi vào `/live/{id}/host` (đã có sessionId)

### 3. Sửa useLiveRtc - Bảo đảm Agora start được gọi đúng context
File: `src/modules/live/hooks/useLiveRtc.ts`

- Thêm error handling rõ ràng hơn khi `createMicrophoneAndCameraTracks` thất bại
- Log chi tiết lỗi để debug

### 4. Thêm fallback UI cho LiveHostPage
File: `src/modules/live/pages/LiveHostPage.tsx`

- Nếu không có sessionId sau bootstrap, hiện thông báo lỗi thay vì màn hình trắng
- Thêm nút "Thử lại" rõ ràng

## Flow mới sau khi sửa
```text
PreLivePage (camera preview)
    |
    v  [User bấm "Phát trực tiếp"] -- user gesture context
    |
    ├── createLiveSession() -- gọi trong onClick
    ├── Navigate tới /live/{sessionId}/host
    |
    v
LiveHostPage
    |
    ├── liveSessionId từ URL params
    ├── Load session data
    ├── start() Agora RTC (vẫn trong useEffect nhưng chỉ join channel)
    └── Render live UI
```

## Các file thay đổi
1. `src/modules/live/pages/PreLivePage.tsx` - Gọi createLiveSession trong onClick
2. `src/modules/live/pages/LiveHostPage.tsx` - Bỏ create session logic, thêm fallback UI
