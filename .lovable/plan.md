

# Fix: CallRoom UI khong hien thi phia nguoi goi (Caller)

## Nguyen nhan goc

Sau khi phan tich code va du lieu trong database, cha tim ra 2 van de chinh:

### Van de 1: Realtime subscription bi tao lai lien tuc (Critical)

Trong `useAgoraCall.ts`, effect lang nghe realtime co dependency array qua lon:

```text
[userId, conversationId, currentSession, callState, incomingCall, endCall]
```

Khi `startCall` chay, no thay doi `callState` (calling -> ringing) va `currentSession` lien tuc. Moi lan thay doi, effect unsubscribe roi subscribe lai kenh realtime. Trong khoang trong giua 2 lan subscribe, cac su kien realtime (vi du: nguoi nhan tra loi, session chuyen thanh 'active') bi mat. Dieu nay khien:
- Caller khong nhan duoc su kien 'active' -> khong chuyen sang 'connected'
- Hoac te hon: nhan duoc su kien tu session cu, goi `endCall()` khong dung luc

### Van de 2: `endCall` thay doi reference lien tuc

`endCall` duoc dinh nghia voi `useCallback([currentSession, callDuration, userId])`. Moi khi `currentSession` hoac `callDuration` thay doi, `endCall` co reference moi, kich hoat lai realtime effect.

`callDuration` thay doi moi giay (do interval), nen realtime subscription bi tao lai MOI GIAY. Day la loi nghiem trong.

### Du lieu minh chung tu database

Tat ca cuoc goi cua ban con (`96231a2f`) deu KHONG BAO GIO ket noi (started_at = null):
- `2247fe20` - video, 17s roi ket thuc, khong ket noi
- `aec126eb` - video, 11s roi ket thuc, khong ket noi  
- `dcce8842` - video, khong ket noi
- `b0de31c4` - voice, VAN CON TREO o trang thai 'ringing' tu 1 gio truoc!

Trong khi cuoc goi cua con (`2d3d04b5`) thi hoat dong binh thuong.

## Ke hoach sua

### 1. Sua `src/modules/chat/hooks/useAgoraCall.ts` - Dung refs thay state trong realtime handler

**Thay doi chinh:**
- Them `currentSessionRef`, `incomingCallRef` de theo doi gia tri moi nhat ma khong trigger re-render
- Realtime subscription chi depend on `[userId, conversationId]` (khong thay doi trong cuoc goi)
- Handler doc gia tri tu refs thay vi closure state
- `endCall` su dung `currentSessionRef` thay vi `currentSession` trong dependency

```text
// Them refs
const currentSessionRef = useRef<CallSession | null>(null);
const incomingCallRef = useRef<CallSession | null>(null);
const callDurationRef = useRef(0);

// Sync refs
useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);
useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

// endCall dung ref thay vi state
const endCall = useCallback(async () => {
  const session = currentSessionRef.current;
  const duration = callDurationRef.current;
  // ... logic dung session va duration tu ref
}, [userId]); // Chi depend on userId

// Realtime subscription chi depend on [userId, conversationId]
useEffect(() => {
  // Handler doc tu callStateRef, currentSessionRef, incomingCallRef
}, [userId, conversationId]);
```

### 2. Sua `src/modules/chat/hooks/useAgoraCall.ts` - Don dep session cu

Them logic don dep session 'ringing' bi treo khi hook khoi tao:

```text
// Khi hook mount, don dep cac session 'ringing' cu hon 2 phut
useEffect(() => {
  if (!conversationId) return;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  supabase
    .from('call_sessions')
    .update({ status: 'missed', ended_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('status', 'ringing')
    .lt('created_at', twoMinutesAgo)
    .then(() => {});
}, [conversationId]);
```

### 3. Sua `src/modules/chat/hooks/useAgoraCall.ts` - Them log de debug

Them console.log khi callState thay doi de de dang debug:

```text
useEffect(() => {
  console.log('[Agora] callState changed:', callState, 
    'session:', currentSession?.id?.slice(0,8));
}, [callState, currentSession]);
```

## Tong ket thay doi

Chi sua 1 file: `src/modules/chat/hooks/useAgoraCall.ts`

1. Them 3 refs moi (currentSessionRef, incomingCallRef, callDurationRef) + sync effects
2. Viet lai `endCall` dung refs, giam dependency xuong `[userId]`
3. Viet lai realtime effect, giam dependency xuong `[userId, conversationId]`, doc tu refs
4. Them cleanup cho stale 'ringing' sessions
5. Them debug logging cho callState changes

## Ket qua mong doi

- Realtime subscription ON DINH, khong bi tao lai khi callState/currentSession thay doi
- Caller se nhan duoc su kien 'active' dung luc -> chuyen sang 'connected' -> CallRoom hien thi dung
- Session cu bi treo se duoc don dep tu dong
- De debug hon voi console logs

