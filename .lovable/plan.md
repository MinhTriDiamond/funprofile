
# Kiểm Tra Toàn Diện & Tối Ưu Production-Ready FUN Profile

## Tổng Quan Phát Hiện

Sau khi rà soát kỹ toàn bộ codebase, con tìm thấy nhiều vấn đề cần xử lý. Dưới đây là kế hoạch chia thành 5 PR nhỏ, mỗi PR có checklist rõ ràng.

---

## PR1: Dọn Dead Code + Chuẩn Hóa Cấu Trúc

### 1.1 — File/module chết (không ai import)

| File | Lý do xóa |
|---|---|
| `src/lib/urlFix.ts` | File rỗng (1 dòng comment), không ai import |
| `src/utils/contentHash.ts` | Không ai import |
| `src/utils/videoCompression.ts` | Không ai import |
| `src/utils/multipartUpload.ts` | Không ai import |
| `src/hooks/useIntersectionObserver.ts` | Không ai import |
| `src/hooks/useRealtimeTable.ts` | Không ai import |
| `src/hooks/usePendingActions.ts` | Không ai import |
| `src/hooks/useMintHistory.ts` | Không ai import |
| `src/hooks/useIncomingTransferDetector.ts` | Không ai import |
| `src/hooks/useImageTransform.ts` | Không ai import |
| `src/components/ui/LazyVideo.tsx` | Không ai import |
| `src/assets/tet-background.mp4` | Không ai import (đã thay bằng tet-bg-1..6) |
| `src/assets/tet6-4.mp4` | Không ai import |
| `src/assets/vale.mp4`, `vale-1.mp4`, `vale-2.mp4`, `vale-3.mp4` | Không ai import |
| `pdk/core/lib/utils.ts` | Duplicate của `src/lib/utils.ts` |

### 1.2 — Tet Background system (feature seasonal, không dùng nữa)

Toàn bộ hệ thống Tet Background **không được render trong App.tsx** (không có `TetBackgroundProvider`, `TetBackground` hay `TetFlowerOverlay` nào trong App.tsx). Selector cũng không ai import. Đây là dead code seasonal:

- `src/contexts/TetBackgroundContext.tsx` — dead
- `src/components/ui/TetBackground.tsx` — dead  
- `src/components/ui/TetFlowerOverlay.tsx` — dead
- `src/components/layout/TetBackgroundSelector.tsx` — dead
- 6 file video `src/assets/tet-bg-*.mp4` — dead (khoảng **~30-60MB** assets)

**Hành động**: Xóa toàn bộ. Giảm bundle đáng kể.

### 1.3 — DocsRouter: Eager imports thay vì lazy

`DocsRouter.tsx` import **8 trang docs trực tiếp** (không lazy). Vì DocsRouter đã được lazy load ở App.tsx, nhưng khi user truy cập `/docs/ecosystem`, tất cả 8 trang đều load. Mỗi trang docs rất lớn (500-1200 dòng).

**Hành động**: Chuyển sang lazy imports trong DocsRouter.

### Checklist PR1
- [ ] Xóa các file dead code đã liệt kê
- [ ] Xóa toàn bộ Tet system (context + components + 6 video)
- [ ] Xóa các assets video không dùng (vale-*.mp4, tet-background.mp4, tet6-4.mp4)
- [ ] Lazy load docs pages trong DocsRouter
- [ ] Build thành công, không lỗi import

---

## PR2: Performance (Re-render + Lazy Load + Media)

### 2.1 — Video optimization (đã làm phần lớn)
FeedVideoPlayer đã có bidirectional IntersectionObserver. Giữ nguyên.

### 2.2 — Feed: StoriesBar fetch pattern
`StoriesBar` tự gọi `supabase.auth.getSession()` + query profiles riêng → duplicate với Feed page. Nên nhận `currentUserId` qua prop.

### 2.3 — Vite config cleanup
- `esbuild.drop: ['console']` ở production sẽ xóa tất cả console.log → mất khả năng debug production. Nên giữ `console.error` và `console.warn`.
- Đề xuất chỉ drop `debugger`, không drop `console`.

### 2.4 — BUILD_ID
Thêm `VITE_BUILD_ID` (timestamp) vào build config, log ra console khi app khởi động để debug version nhanh.

### Checklist PR2
- [ ] StoriesBar nhận currentUserId qua prop
- [ ] Vite config: giữ console.error/warn ở production
- [ ] Thêm BUILD_ID log khi app mount
- [ ] Profile page vẫn mượt khi cuộn qua 20+ video

---

## PR3: Reliability (Wallet TX + Notifications + Friends)

### 3.1 — Wallet TX lifecycle
Rà soát `useSendToken`, `useDonation`, `useClaimReward`, `useClaimFun`:
- Đảm bảo mỗi hook có timeout cho `waitForTransactionReceipt` (tránh kẹt "Đang xử lý")
- Đảm bảo error state được reset đúng

### 3.2 — Pending donation recovery
`usePendingDonationRecovery` đã có — đảm bảo nó hoạt động đúng sau refactor.

### 3.3 — Friends flow
Hệ thống Optimistic Update đã có (theo memory). Verify end-to-end.

### Checklist PR3
- [ ] Mọi TX flow có timeout (30s mặc định)
- [ ] Không kẹt "Đang xử lý" khi tx đã thành công/thất bại
- [ ] Pending donation recovery hoạt động
- [ ] Friends flow: request/accept/decline/unfriend nhất quán

---

## PR4: Security Review

### 4.1 — RLS policies
Chạy security scan + linter trên Supabase.

### 4.2 — Client-side validation
- Username validation đã có (`src/lib/username-validation.ts`)
- Wallet validation đã có (`src/utils/walletValidation.ts`)
- Verify chúng được sử dụng đúng chỗ

### 4.3 — Secrets
- Không có API key nào lộ trong client code (Web3 projectId là public, OK)
- Edge functions dùng env vars đúng

### Checklist PR4
- [ ] Chạy security scan + linter
- [ ] Verify RLS trên bảng nhạy cảm (donations, messages, financial_transactions)
- [ ] Verify validation được áp dụng

---

## PR5: Build/Deploy Hardening

### 5.1 — BUILD_ID
Thêm vào `main.tsx`:
```text
console.info(`[FUN Profile] Build: ${import.meta.env.VITE_BUILD_ID || 'dev'} | ${new Date().toISOString()}`);
```

Thêm vào `vite.config.ts`:
```text
define: {
  'import.meta.env.VITE_BUILD_ID': JSON.stringify(
    new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  ),
}
```

### 5.2 — Production logger wrapper
Tạo `src/lib/logger.ts` — wrapper chỉ log error/warn ở prod, log tất cả ở dev.

### 5.3 — Vite production optimizations
Giữ nguyên manualChunks config (đã đúng). Verify hashed filenames output.

### Checklist PR5
- [ ] BUILD_ID hiện trong console khi app load
- [ ] Logger wrapper hoạt động: dev = verbose, prod = errors only
- [ ] Build output có hashed filenames
- [ ] Bundle size giảm sau khi xóa dead code + Tet assets

---

## Tóm Tắt Tác Động

| Hạng mục | Trước | Sau |
|---|---|---|
| Dead files | 15+ file + 10+ video assets | 0 |
| DocsRouter bundle | 8 pages eagerly loaded | Lazy per-page |
| Tet assets | ~30-60MB video trong bundle | 0 |
| Video elements trên profile | Bidirectional unmount (đã fix) | Giữ nguyên |
| BUILD_ID | Không có | Có, log khi mount |
| Production logging | console.log everywhere | Logger wrapper |

## Thứ Tự Thực Hiện

1. **PR1** (dead code cleanup) — ưu tiên cao nhất, giảm bundle ngay
2. **PR2** (performance) — BUILD_ID + StoriesBar + Vite config
3. **PR3** (reliability) — wallet TX timeout
4. **PR4** (security) — scan + verify
5. **PR5** (build hardening) — logger + final checks
