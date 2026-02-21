
# Sua loi: Khong hien thi giao dien UI khi goi video/voice call

## Nguyen nhan goc

Khi bam nut goi video/voice trong `MessageThread`, ham `startCall()` duoc goi thanh cong (tao session, lay token, tham gia kenh Agora), nhung **khong co component `CallRoom` nao duoc render** de hien thi giao dien cuoc goi. Component `CallRoom` da duoc viet san nhung chua bao gio duoc su dung.

Tuong tu, `IncomingCallDialog` va `answerCall`/`declineCall` cua `useAgoraCall` cung khong duoc ket noi voi UI trong `MessageThread`.

## Ke hoach sua

### Sua file `src/modules/chat/components/MessageThread.tsx`

1. **Import them `CallRoom` va `IncomingCallDialog`**:
   - Them import `CallRoom` va `IncomingCallDialog` tu cung thu muc components

2. **Lay du cac gia tri tu `useAgoraCall`**:
   - Hien tai chi lay `callState` va `startCall`
   - Can lay them: `callType`, `currentSession`, `remoteUsers`, `isMuted`, `isCameraOff`, `callDuration`, `localVideoTrack`, `localAudioTrack`, `incomingCall`, `answerCall`, `declineCall`, `endCall`, `toggleMute`, `toggleCamera`, `switchToVideo`, `flipCamera`

3. **Render `CallRoom` khi `callState` khac `'idle'`**:
   - Hien thi dialog `CallRoom` fullscreen khi co cuoc goi dang dien ra (calling, ringing, connecting, connected)
   - Truyen cac props: callState, callType, callDuration, localVideoTrack, remoteUsers, isMuted, isCameraOff, va cac ham dieu khien

4. **Render `IncomingCallDialog` khi co cuoc goi den**:
   - Hien thi dialog khi `incomingCall` khac null
   - Ket noi voi `answerCall` va `declineCall`

5. **Truyen thong tin user cho CallRoom**:
   - `localUserInfo`: lay tu profile cua user hien tai (username)
   - `remoteUserInfo`: lay tu `headerProfile` (ten va avatar cua nguoi nhan)

### Chi tiet code thay doi

```text
MessageThread.tsx:
  Line 7:   Them import CallRoom
  Line 20:  Them import IncomingCallDialog (tu modules/chat)
  Line 80-84: Mo rong destructure useAgoraCall de lay tat ca cac gia tri can thiet
  Line 618+: Them render CallRoom va IncomingCallDialog truoc the dong </div> cuoi cung
```

## Ket qua mong doi
- Khi bam nut goi, giao dien `CallRoom` fullscreen se hien thi voi trang thai "Dang do chuong..." hoac "Dang ket noi..."
- Khi ket noi thanh cong, hien thi video grid (video call) hoac avatar (voice call) voi dong ho dem thoi gian
- Khi co cuoc goi den, hien thi dialog `IncomingCallDialog` voi nut Tra loi/Tu choi
- Cac nut dieu khien (tat mic, tat camera, ket thuc cuoc goi) hoat dong binh thuong
