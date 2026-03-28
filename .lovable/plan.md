
Mục tiêu: để user đã liên kết/kết nối ví trên desktop thì khi mở mobile vẫn được nhận diện là “đã có ví”, đồng thời không làm sai sự thật về khả năng ký giao dịch trên thiết bị mới.

1. Kết luận quan trọng
- Hiện tại trang ví đang lấy trạng thái từ `wagmi useAccount().isConnected`, nên đây chỉ là “đã kết nối ví trên thiết bị hiện tại”.
- Vì vậy desktop và mobile không sync với nhau là đúng theo cơ chế wallet provider.
- WalletConnect persistent session cũng không giải quyết triệt để đa thiết bị: session vẫn gắn với từng app/browser. Thiết bị mới vẫn không thể tự có quyền ký nếu chưa có session cục bộ.
- Cái có thể sync an toàn là:
  - ví đã liên kết với tài khoản
  - địa chỉ ví ưu tiên để hiển thị tài sản/read-only
  - thông tin chain/connector lần cuối để hiển thị tham khảo
- Cái không thể “auto sync” thật sự giữa desktop/mobile:
  - quyền ký message
  - quyền ký giao dịch
  - phiên provider đang hoạt động

2. Hướng triển khai nên làm
Tách rõ 2 trạng thái:
- Đã liên kết ví với tài khoản
- Đã kết nối ví trên thiết bị này

Logic mới:
```text
linkedWalletAddress = public_wallet_address
  || external_wallet_address
  || login_wallet_address
  || wallet_address

deviceWalletAddress = activeAddress || address
isDeviceConnected = wagmi.isConnected
displayWalletAddress = deviceWalletAddress || linkedWalletAddress
```

3. Cách sửa trong app
A. Wallet page dùng ví đã liên kết làm fallback
- Sửa `src/components/wallet/WalletCenterContainer.tsx`
- Mở rộng `fetchProfile()` để lấy thêm:
  - `public_wallet_address`
  - `external_wallet_address`
  - `login_wallet_address`
  - `wallet_address`
- Nếu mobile chưa có session ví nhưng profile đã có ví liên kết:
  - không hiện màn “Chưa kết nối ví” toàn trang nữa
  - vẫn render wallet page ở chế độ read-only
  - dùng `displayWalletAddress` để load balance/history bằng các hook đã có `customAddress`

B. UI phải nói đúng bản chất
- Sửa `src/components/wallet/WalletCard.tsx`
- Đổi 1 badge “Đã kết nối / Chưa kết nối” thành 2 lớp trạng thái:
  - “Đã liên kết ví” nếu có `linkedWalletAddress`
  - “Đã kết nối trên thiết bị này” nếu `isDeviceConnected`
- Nếu chỉ linked mà chưa device-connected:
  - vẫn cho xem địa chỉ, số dư, lịch sử
  - nhưng disable/đổi CTA cho các action cần ký như Gửi, Swap, Claim
  - hiện nút “Kết nối lại để giao dịch”

C. Giữ chặt các flow cần chữ ký
- `UnifiedGiftSendDialog`, `ClaimRewardDialog`, các flow send/swap/claim vẫn phải yêu cầu kết nối ví trên thiết bị hiện tại.
- Nghĩa là:
  - cross-device sync cho phần nhận diện + hiển thị
  - không giả vờ coi linked wallet là session thật

D. Đồng bộ từ backend làm source of truth
- Không dùng `localStorage` làm nguồn xác định ví đã liên kết giữa thiết bị.
- `profiles` hiện đã có đủ các cột ví để làm source of truth cho linked state.
- `useLoginMethods` đã gần đúng; cần áp dụng cùng nguyên tắc này cho wallet page và reward page.

4. Có cần lưu wallet address + chain ở backend không?
Có, nhưng nên hiểu đúng mục đích:
- `wallet address`: nên lưu, và dự án đã lưu rồi.
- `chain`: có thể lưu thêm, nhưng chỉ để hiển thị “lần cuối user dùng chain nào”.
- Không dùng `chain` đã lưu để coi như user đang kết nối thật.

Khuyến nghị:
- Phase 1: không cần đổi schema, tận dụng luôn các field ví sẵn có để sửa lỗi UX cross-device.
- Phase 2 (nếu muốn đầy đủ hơn): thêm bảng riêng kiểu `wallet_connection_presence` để lưu:
  - `user_id`
  - `wallet_address`
  - `chain_id`
  - `connector_type`
  - `device_type`
  - `last_seen_at`
  - `is_active_on_device` hoặc trạng thái gần nhất
- Bảng này chỉ phục vụ hiển thị/tracking, không đại diện cho quyền ký.

5. File dự kiến cần chỉnh
- `src/components/wallet/WalletCenterContainer.tsx`
- `src/components/wallet/WalletCard.tsx`
- `src/components/wallet/tabs/AssetTab.tsx`
- `src/components/wallet/tabs/RewardTab.tsx`
- `src/components/wallet/ClaimRewardsSection.tsx`
- Có thể thêm 1 hook/helper mới để gom logic:
  - ví dụ `useWalletPresenceState` hoặc helper trong `src/lib`

6. Kết quả sau khi làm
- User connect ví trên desktop, rồi mở mobile:
  - mobile sẽ nhận ra tài khoản này đã có ví liên kết
  - hiển thị đúng địa chỉ ví/số dư/lịch sử ở chế độ read-only
  - không còn báo sai kiểu “chưa có ví”
- Nếu user muốn gửi quà / claim / swap trên mobile:
  - app sẽ yêu cầu kết nối ví trên chính mobile lúc đó
- UX rõ ràng hơn, không nhầm giữa “đã liên kết ví” và “đã có phiên giao dịch trên máy này”

7. Chi tiết kỹ thuật cần giữ
- Luôn ưu tiên so sánh/lưu địa chỉ ví dạng lowercase
- Không overwrite mù các field ví xác thực bằng chữ ký
- Không dùng WalletConnect multi-device như giải pháp chính cho sync trạng thái
- `WALLET_DISCONNECTED_KEY` hiện chỉ có ý nghĩa cục bộ; sau khi sửa cần để nó chỉ điều khiển “device session UI”, không được che mất trạng thái linked wallet từ backend

8. Đề xuất triển khai
Tôi khuyên làm theo 2 bước:
- Bước 1: sửa UI/logic để sync “đã liên kết ví” giữa desktop-mobile bằng dữ liệu backend hiện có
- Bước 2: nếu cần thêm “chain/connector/device last seen”, bổ sung bảng presence riêng để hiển thị nâng cao

Đây là cách đúng và an toàn nhất cho fun.rich: sync được nhận diện ví giữa các thiết bị, nhưng vẫn tôn trọng giới hạn bảo mật của wallet signing.
