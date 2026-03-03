
# Kiểm Tra Toàn Diện & Tối Ưu Production-Ready FUN Profile

## Tổng Quan Phát Hiện

Sau khi rà soát kỹ toàn bộ codebase, con tìm thấy nhiều vấn đề cần xử lý. Dưới đây là kế hoạch chia thành 5 PR nhỏ, mỗi PR có checklist rõ ràng.

---

## PR1: Dọn Dead Code + Chuẩn Hóa Cấu Trúc ✅ DONE

### Checklist PR1
- [x] Xóa các file dead code (urlFix, contentHash, hooks không dùng, LazyVideo, pdk/core/lib/utils)
- [x] Xóa toàn bộ Tet system (context + components + selector)
- [x] Xóa các assets video không dùng (vale-*.mp4, tet-background.mp4, tet6-4.mp4, tet-bg-1..6.mp4)
- [x] Lazy load docs pages trong DocsRouter
- [x] Build thành công, không lỗi import
- Note: videoCompression.ts và multipartUpload.ts được giữ lại vì thực tế đang được lazy import

---

## PR2: Performance (Re-render + Lazy Load + Media) ✅ DONE

### Checklist PR2
- [x] StoriesBar nhận currentUserId qua prop (không gọi getSession riêng)
- [x] Vite config: chỉ drop debugger, giữ console.error/warn ở production
- [x] Thêm BUILD_ID log khi app mount
- [x] Logger wrapper tạo (src/lib/logger.ts)

---

## PR3: Reliability (Wallet TX + Notifications + Friends) — TODO

### 3.1 — Wallet TX lifecycle
Rà soát `useSendToken`, `useDonation`, `useClaimReward`, `useClaimFun`:
- Đảm bảo mỗi hook có timeout cho `waitForTransactionReceipt` (tránh kẹt "Đang xử lý")
- Đảm bảo error state được reset đúng

### Checklist PR3
- [ ] Mọi TX flow có timeout (30s mặc định)
- [ ] Không kẹt "Đang xử lý" khi tx đã thành công/thất bại
- [ ] Pending donation recovery hoạt động
- [ ] Friends flow: request/accept/decline/unfriend nhất quán

---

## PR4: Security Review — TODO

### Checklist PR4
- [ ] Chạy security scan + linter
- [ ] Verify RLS trên bảng nhạy cảm (donations, messages, financial_transactions)
- [ ] Verify validation được áp dụng

---

## PR5: Build/Deploy Hardening — TODO

### Checklist PR5
- [x] BUILD_ID hiện trong console khi app load
- [x] Logger wrapper hoạt động: dev = verbose, prod = errors only
- [ ] Bundle size giảm sau khi xóa dead code + Tet assets (cần verify)
