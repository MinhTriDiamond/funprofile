

# Nâng cấp Mobile Wallet Login — MetaMask, Trust Wallet, Bitget trên iOS & Android

## Tóm tắt
File upload chứa hệ thống wallet login mobile hoàn chỉnh với nhiều tính năng mà code hiện tại đang thiếu: deep link mở app ví trên điện thoại, phát hiện dApp browser (MetaMask/Trust Wallet), xử lý pending sign request, step progress bar, switch wallet, và resume flow khi quay lại từ app ví. Hiện tại `WalletLoginContent.tsx` chỉ có flow đơn giản qua RainbowKit modal — không tối ưu cho mobile.

## Vấn đề hiện tại
- **Không có deep link**: User mobile phải tự mở MetaMask/Trust Wallet rồi paste URL
- **Không phát hiện dApp browser**: Khi user đã ở trong MetaMask browser, vẫn hiện modal RainbowKit thừa
- **Không xử lý pending request**: MetaMask error -32002 khi bấm ký nhiều lần
- **Không có nút đổi ví / ngắt kết nối**: Phải refresh page
- **Không có progress indicator**: User không biết đang ở bước nào
- **Thiếu Bitget Wallet deep link**: File upload chưa có, cần bổ sung

## Kế hoạch thực hiện

### 1. Tạo `src/utils/mobileWalletConnect.ts` (file MỚI)
Toàn bộ utility functions cho mobile wallet:
- `isMobileDevice()`, `isMetaMaskMobileBrowser()`, `isTrustWalletMobileBrowser()`, `isBitgetMobileBrowser()`
- `getMetaMaskDeepLink()`, `getTrustWalletDeepLink()`, `getBitgetDeepLink()`
- `getWalletAppLinks()` (link tải app cho cả iOS và Android)
- `getInjectedProvider()`, `ensureBscNetwork()`, `normalizeChainId()`
- `requestInjectedAccounts()`, `getInjectedAccounts()`
- Lấy từ file upload, bổ sung thêm Bitget Wallet

### 2. Tạo `src/utils/walletSessionReset.ts` (file MỚI)
- `clearWalletLocalStorage()` — dọn WalletConnect + wagmi localStorage
- `fullWalletDisconnect()` — disconnect wagmi + clear storage
- `requestWalletSwitch()` — wallet_requestPermissions để đổi account

### 3. Tạo `src/lib/walletFlowShared.ts` (file MỚI)
Shared types và helpers cho wallet auth flow:
- Types: `WalletFlowPhase`, `WalletAuthMode`, `WalletAuthSnapshot`, `NoncePayload`
- Helpers: `normalizeAddress()`, `isValidEvmAddress()`, `classifyWalletError()`, `logWalletAuth()`
- Backend calls: `requestBackendNonce()` (gọi `sso-web3-auth` challenge), `verifyWalletLoginSignature()` (gọi `sso-web3-auth` verify), `completeSupabaseWalletSession()`
- Snapshot persistence cho resume flow

### 4. Tạo `src/hooks/useWalletAuth.ts` (hook MỚI)
Hook chính quản lý toàn bộ wallet auth state machine:
- Phases: idle → connecting → connected → wrong_chain → signing → verifying → authenticated
- Dual mode: `injected_mobile_browser` (MetaMask/Trust/Bitget dApp browser) vs `wallet_modal_or_walletconnect`
- Auto-detect injected provider trên mobile
- Handle pending request (MetaMask -32002), background/foreground transitions
- `connectWallet()`, `startWalletLoginFlow()`, `retryCurrentStep()`, `resumePendingFlowCheck()`, `switchWalletAccount()`, `disconnectWallet()`

### 5. Viết lại `src/components/auth/WalletLoginContent.tsx`
Thay thế hoàn toàn bằng UI mới từ file upload (WalletLoginPanel), bao gồm:
- **StepProgressBar**: 4 bước (Kết nối → Mạng → Ký → Xong)
- **Mobile deep links**: Nút "Mở trong MetaMask", "Mở trong Trust Wallet", "Mở trong Bitget"
- **dApp browser detection**: Nếu đang trong MetaMask/Trust/Bitget browser → hiện nút kết nối trực tiếp, không mở modal
- **Wrong chain screen**: Nút chuyển sang BSC
- **Signing/pending screen**: Helper text, nút "Tôi đã xác nhận", nút mở lại app ví
- **Error screen**: Nút thử lại, đổi ví
- **Connected screen**: Hiện địa chỉ, nút "Ký và đăng nhập", đổi ví, ngắt kết nối
- Giữ nguyên Dialog onboarding cho new user

### 6. Cập nhật backend calls
File upload dùng `siwe-nonce` / `siwe-verify` nhưng project hiện tại dùng `sso-web3-auth` với action `challenge` / verify. Sẽ adapt `walletFlowShared.ts` để gọi đúng edge function `sso-web3-auth` đã có.

## Tổng cộng: 4 file mới + 1 file viết lại
- `src/utils/mobileWalletConnect.ts` (MỚI)
- `src/utils/walletSessionReset.ts` (MỚI)
- `src/lib/walletFlowShared.ts` (MỚI)
- `src/hooks/useWalletAuth.ts` (MỚI)
- `src/components/auth/WalletLoginContent.tsx` (VIẾT LẠI)

## Không cần thay đổi
- Edge function `sso-web3-auth` — đã hoạt động tốt
- `Web3Provider.tsx` — đã global, không cần wrap thêm
- `web3.ts` config — đã có MetaMask, Trust, Bitget connector
- Database — không cần migration

