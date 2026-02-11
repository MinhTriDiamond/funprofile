

# Sua Loi Ngat Ket Noi Vi (Disconnect Wallet Race Condition)

## Van de
Khi nguoi dung bam "Disconnect", co mot race condition:
- `showDisconnectedUI` duoc set `true`
- Nhung wagmi van bao `isConnected = true` trong choc lat
- Effect o dong 135 thay `isConnected = true` va **xoa** co disconnect ngay lap tuc
- Khi wagmi thuc su disconnect xong, `showDisconnectedUI` da bi xoa mat -> UI khong hien man hinh "Ket noi vi" ma van hien giao dien vi cu voi du lieu rong

## Giai phap
Them mot `useRef` de theo doi khi nao nguoi dung chu dong disconnect, ngan effect o dong 135 xoa co `showDisconnectedUI` trong thoi gian disconnect dang xu ly.

## Chi tiet ky thuat

### File thay doi: `src/components/wallet/WalletCenterContainer.tsx`

1. **Them `intentionalDisconnectRef`** (useRef):
   - Set `true` trong `handleDisconnect` truoc khi goi `disconnect()`
   - Bao ve co `showDisconnectedUI` khong bi xoa boi effect

2. **Sua effect o dong 134-140** (clear disconnected flag):
   - Kiem tra `intentionalDisconnectRef.current` truoc khi xoa co
   - Neu dang trong qua trinh disconnect chu dong -> khong xoa
   - Chi xoa khi nguoi dung ket noi lai that su (qua `handleConnect`)

3. **Sua `handleConnect`** (dong 303-311):
   - Reset `intentionalDisconnectRef` khi nguoi dung chu dong bam ket noi lai

4. **Sua dieu kien hien thi disconnected UI** (dong 375):
   - Don gian hoa: `if (!isConnected && showDisconnectedUI)` hoac `if (showDisconnectedUI && !isConnected)`
   - Bo `!hasAnyWallet` vi no trung lap voi `!isConnected`

5. **Them cleanup localStorage wagmi** trong `handleDisconnect`:
   - Xoa `wagmi.store`, `wagmi.connected`, va cac WalletConnect session keys
   - Dam bao disconnect triet de, khong tu dong reconnect khi reload trang

