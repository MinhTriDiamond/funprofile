
# Fix: Chat khong keo len duoc de xem tin nhan cu

## Van de
Component `MessageThread` su dung `ScrollArea` (Radix UI) de hien thi tin nhan. Radix ScrollArea co 2 phan:
- **Root**: nhan `ref`, co `overflow: hidden`
- **Viewport**: phan tu thuc su cuon, nhung KHONG nhan `ref`

Ket qua: `scrollRef` tro vao Root (khong cuon duoc), nen:
1. Tu dong cuon xuong cuoi (`scrollTop = scrollHeight`) khong hoat dong dung
2. Quan trong hon: tren mobile, Radix ScrollArea co the khong xu ly touch scroll tot khi `flex-1` khong cho chieu cao co dinh

## Giai phap
Thay `ScrollArea` bang `div` voi `overflow-y-auto` - don gian, de bao va hoat dong tot tren moi thiet bi.

## Chi tiet ky thuat

### File sua: `src/components/chat/MessageThread.tsx`

1. Xoa import `ScrollArea`
2. Thay dong 174:
```
<ScrollArea ref={scrollRef} className="flex-1 p-4">
```
Thanh:
```
<div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
```
3. Thay dong 199:
```
</ScrollArea>
```
Thanh:
```
</div>
```

Chi 3 dong thay doi, khong anh huong den bat ky chuc nang nao khac.
