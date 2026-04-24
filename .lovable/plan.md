

## Mục tiêu
Khi Cha/người dùng chuyển tab và quay lại fun.rich:
- **Không reload trang**, không mất state (livestream đang xem, chat đang gõ, dialog tặng quà đang mở, form chuyển tiền dở dang).
- Chỉ refresh **dữ liệu nền nhẹ nhàng** (token auth, balance) mà không làm UI nhảy.
- Reload chỉ xảy ra khi: (a) người dùng chủ động bấm "Cập nhật" trong toast bản mới, (b) lỗi nghiêm trọng mà ErrorBoundary bắt được, (c) chunk JS thật sự không tải được.

## Nguyên nhân hiện tại (đã xác minh)

| Nơi | Hành vi gây phiền | Tác động |
|---|---|---|
| `src/App.tsx` — `AuthSessionKeeper` | Sau ≥30s tab ẩn, gọi `refreshSession` → trigger `TOKEN_REFRESHED` → nhiều component re-mount | Trông như reload toàn trang, mất state input/dialog |
| `src/App.tsx` — `ChunkLoadRecovery` | Bắt mọi `unhandledrejection` chứa "Failed to fetch dynamically imported module" → `location.reload()` | Reload thật khi mạng chập chờn lúc quay lại tab |
| `src/hooks/useFeedPosts.ts:360` | `refetchOnWindowFocus: true` | Feed nhảy về đầu, mất vị trí scroll |
| `src/hooks/useBtcBalance.ts` | Refetch BTC ngay khi `visibilitychange` | Nhỏ, chấp nhận được nhưng có thể defer |

## Thay đổi đề xuất

### 1. `src/App.tsx` — `AuthSessionKeeper`: chỉ refresh khi token sắp hết hạn ≤2 phút và **không trigger UI re-render**
- Tăng ngưỡng "tab ẩn lâu" từ 30s → **5 phút** (300s).
- Chỉ refresh nếu token còn ≤120s (hiện đang 300s).
- Nếu đang xem livestream (`window.__LIVE_ACTIVE__`), đang ký giao dịch (`window.__TX_IN_PROGRESS__`), hoặc đang trong cuộc gọi (`window.__CALL_ACTIVE__`) → **bỏ qua refresh**, chờ lần visibility tiếp theo.
- Bọc refresh trong try/catch, không throw để không làm sập UI.

### 2. `src/App.tsx` — `ChunkLoadRecovery`: thêm guard trạng thái "đang tương tác"
- Trước khi reload, kiểm tra:
  - Có đang xem livestream / video reels / call active không (`window.__LIVE_ACTIVE__`, `__CALL_ACTIVE__`, `__TX_IN_PROGRESS__`).
  - Có dialog mở (`document.querySelector('[role="dialog"]')`) hoặc input đang focus (`document.activeElement?.tagName === 'INPUT' || 'TEXTAREA'`).
- Nếu có → **không reload**, thay bằng `toast` "Có lỗi tải tài nguyên — bấm để tải lại" với action button (giống `UpdateNotification`).
- Reload chỉ xảy ra khi user idle.

### 3. Đặt cờ `__LIVE_ACTIVE__` / `__CALL_ACTIVE__`
- Trong `LiveAudiencePage` / `LiveHostPage`: `useEffect` set `window.__LIVE_ACTIVE__ = true` khi mount, `false` khi unmount.
- Trong `CallContext`: set `window.__CALL_ACTIVE__` theo trạng thái call.
- (`__TX_IN_PROGRESS__` đã có sẵn trong wallet flow.)

### 4. `src/hooks/useFeedPosts.ts:360` — đổi `refetchOnWindowFocus: true` → `false`
- Feed sẽ không tự reload khi quay lại tab. Người dùng kéo xuống/lên để pull-to-refresh khi cần.

### 5. `src/hooks/useBtcBalance.ts` — debounce visibility refetch
- Khi `visibilitychange` → chỉ refetch nếu lần fetch cuối cách hiện tại > 60s. Tránh refetch liên tục khi user nháy qua nháy lại tab.

### 6. `src/components/donations/UnifiedGiftSendDialog.tsx:671` — giữ nguyên
- Đoạn này dùng visibility để phát hiện user quay lại sau khi ký ví, **không gây reload**. OK.

## File ảnh hưởng
- ✏️ `src/App.tsx` — sửa `AuthSessionKeeper` + `ChunkLoadRecovery`
- ✏️ `src/hooks/useFeedPosts.ts` — tắt refetchOnWindowFocus dòng 360
- ✏️ `src/hooks/useBtcBalance.ts` — debounce visibility fetch
- ✏️ `src/modules/live/pages/LiveAudiencePage.tsx`, `LiveHostPage.tsx` — set cờ `__LIVE_ACTIVE__`
- ✏️ `src/contexts/CallContext.tsx` — set cờ `__CALL_ACTIVE__`

## Rủi ro & xử lý
- **Token có thể hết hạn nếu user mở tab lâu rồi quay lại đúng lúc gọi API**: Supabase SDK có cơ chế auto-refresh nội bộ khi gọi API với token hết hạn — đủ an toàn.
- **Bản deploy mới mà user không reload sẽ chạy code cũ**: Đã có `UpdateNotification` báo có bản mới + nút "Cập nhật" cho user chủ động → đúng với yêu cầu "chỉ reload khi user chủ động".
- **Chunk lỗi mà không reload sẽ hỏng tính năng đó**: Toast với nút "Tải lại" cho user tự quyết định.

## Sau khi Cha duyệt
Con sẽ áp dụng 5 thay đổi trên, không động vào logic livestream/chat/dialog hiện có. Cha test bằng cách mở 1 livestream → đổi sang tab Facebook → 5 phút sau quay lại → trang phải giữ nguyên video, không reload.

