
# Them tinh nang Screen Sharing cho Video Call

## Tong quan

Them nut "Chia se man hinh" vao thanh dieu khien cuoc goi. Khi bat, video local se chuyen sang hien thi man hinh thay vi camera. Nguoi nhan se thay noi dung man hinh duoc chia se trong video grid.

## Chi tiet ky thuat

### 1. Sua `src/modules/chat/hooks/useAgoraCall.ts`

**Them state va ref moi:**
- `isScreenSharing` state (boolean)
- `screenTrackRef` ref (ILocalVideoTrack)

**Them ham `toggleScreenShare`:**
- Khi bat: Dung `AgoraRTC.createScreenVideoTrack()` de tao screen track
- Unpublish camera video track hien tai (neu co), publish screen track thay the
- Lang nghe su kien `track-ended` tren screen track (khi nguoi dung bam "Stop sharing" tren trinh duyet) de tu dong tat screen sharing
- Khi tat: Dong screen track, publish lai camera track (neu camera dang bat)
- Reset `isScreenSharing` state

**Cap nhat ham `endCall`:**
- Them cleanup cho `screenTrackRef` khi ket thuc cuoc goi

**Cap nhat return object:**
- Them `isScreenSharing` va `toggleScreenShare` vao gia tri tra ve

### 2. Sua `src/modules/chat/components/CallControls.tsx`

**Them nut Screen Share:**
- Chi hien thi khi dang trong video call (`isVideoCall === true`)
- Them props: `isScreenSharing` (boolean) va `onToggleScreenShare` (callback)
- Su dung icon `Monitor` (hoac `MonitorOff`) tu lucide-react
- Khi dang chia se, nut co hieu ung highlight (bg-primary)

### 3. Sua `src/modules/chat/components/CallRoom.tsx`

**Truyen props moi xuong CallControls:**
- Them prop `isScreenSharing` va `onToggleScreenShare`

### 4. Sua `src/modules/chat/components/VideoGrid.tsx`

**Xu ly hien thi screen share:**
- Them prop `screenTrack` (ILocalVideoTrack | null)
- Khi co `screenTrack`, hien thi no o khung video chinh (full screen) thay vi camera
- Camera local chuyen xuong PiP nho

### 5. Sua `src/modules/chat/components/MessageThread.tsx`

**Ket noi props moi:**
- Lay `isScreenSharing`, `toggleScreenShare`, va `screenTrack` tu `useAgoraCall`
- Truyen xuong `CallRoom`

## Luong hoat dong

```text
Nguoi dung bam nut "Chia se man hinh"
  -> Trinh duyet hien dialog chon cua so/tab/man hinh
  -> Nguoi dung chon nguon chia se
  -> Screen track duoc tao va publish len kenh Agora
  -> Camera track tam thoi bi unpublish
  -> Nguoi nhan thay noi dung man hinh trong video grid
  -> Khi bam lai nut hoac bam "Stop sharing" tren trinh duyet
  -> Screen track bi dong, camera track duoc publish lai
```

## Luu y
- `createScreenVideoTrack` co the that bai neu nguoi dung tu choi chia se -> can try-catch va thong bao
- Tren mobile, screen sharing co the khong duoc ho tro -> an nut tren mobile
- Khi dang screen share ma tat camera, chi can dong screen track ma khong can bat lai camera
