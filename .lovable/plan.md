
# Sua loi "AgoraRTCError NOT_READABLE: Could not start video source"

## Nguyen nhan

Loi `NOT_READABLE: NotReadableError: Could not start video source` xay ra khi Agora SDK khong the truy cap camera. Cac nguyen nhan pho bien:

1. **Camera dang bi ung dung khac su dung** (Zoom, Teams, trinh duyet khac...)
2. **Trinh duyet khong cap quyen camera** hoac quyen bi thu hoi
3. **Thiet bi khong co camera** hoac driver loi

Hien tai code tai dong 202-205 trong `useAgoraCall.ts` goi `AgoraRTC.createMicrophoneAndCameraTracks()` - neu camera khong kha dung, toan bo cuoc goi that bai va khong co fallback.

## Ke hoach sua

### Sua file `src/modules/chat/hooks/useAgoraCall.ts`

**Thay doi 1: Fallback khi camera khong kha dung (dong 198-211)**

Khi goi video, neu `createMicrophoneAndCameraTracks()` that bai, thu tao rieng tung track:
- Thu tao ca audio + video
- Neu that bai, thu tao chi audio (fallback thanh voice call voi thong bao)
- Neu audio cung that bai, bao loi ro rang cho nguoi dung

```typescript
// Thay the dong 198-211:
let audioTrack: IMicrophoneAudioTrack;
let videoTrack: ICameraVideoTrack | null = null;

if (type === 'video') {
  try {
    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    audioTrack = tracks[0];
    videoTrack = tracks[1];
  } catch (videoErr: any) {
    console.warn('[Agora] Camera not available, falling back to audio only:', videoErr.message);
    try {
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      type = 'voice'; // Fallback to voice
      toast({
        title: 'Camera khong kha dung',
        description: 'Cuoc goi se chuyen sang che do thoai vi khong the truy cap camera.',
      });
    } catch (audioErr: any) {
      throw new Error('Khong the truy cap microphone va camera. Vui long kiem tra quyen truy cap thiet bi.');
    }
  }
} else {
  try {
    audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  } catch (audioErr: any) {
    throw new Error('Khong the truy cap microphone. Vui long kiem tra quyen truy cap thiet bi.');
  }
}
```

**Thay doi 2: Fallback cho `switchToVideo` (dong 514-527)**

Tuong tu, them try-catch va thong bao khi camera khong kha dung thay vi loi im lang:

```typescript
const switchToVideo = useCallback(async () => {
  if (callType === 'video' || !clientRef.current) return;
  try {
    const videoTrack = await AgoraRTC.createCameraVideoTrack();
    localVideoTrackRef.current = videoTrack;
    await clientRef.current.publish(videoTrack);
    setCallType('video');
    setIsCameraOff(false);
  } catch (error: any) {
    console.error('Failed to switch to video:', error);
    toast({
      title: 'Camera khong kha dung',
      description: 'Khong the bat camera. Vui long kiem tra quyen truy cap.',
      variant: 'destructive',
    });
  }
}, [callType, toast]);
```

## Tong ket
- Khi camera bi loi, cuoc goi video se tu dong chuyen sang cuoc goi thoai (voice) thay vi that bai hoan toan
- Nguoi dung se nhan duoc thong bao ro rang ve trang thai
- Chuc nang "Switch to video" cung duoc xu ly loi tuong tu
