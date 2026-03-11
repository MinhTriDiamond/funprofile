

## Sửa lỗi giao diện xác nhận tặng tiền trên điện thoại

Từ screenshot: nội dung Step 2 (xác nhận) quá dài, nút "Quay lại" / "Đang xử lý" bị sát/che bởi bottom nav bar. Cần thu gọn nội dung trên mobile.

### Thay đổi trong `src/components/donations/gift-dialog/GiftConfirmStep.tsx`

1. **Ẩn wallet address trên mobile** cho cả sender (line 88-93) và recipient (`SingleRecipientDisplay` line 265-269) — thêm `hidden sm:flex`
2. **Giảm spacing tổng thể**: `space-y-4` → `space-y-3 sm:space-y-4` (line 77), card padding `p-4` → `p-3 sm:p-4` (line 78), inner `space-y-4` → `space-y-3 sm:space-y-4` (line 78)
3. **Thu gọn amount badge**: `py-2` → `py-1.5`, `gap-3` → `gap-2` (line 98)
4. **Thu gọn message box**: `p-3` → `p-2 sm:p-3` (line 158)
5. **Thu gọn warning box**: `p-3` → `p-2 sm:p-3` (line 172)

### Thay đổi trong `src/components/donations/UnifiedGiftSendDialog.tsx`

6. **Tăng bottom padding scroll area**: `pb-4` → `pb-6` trên mobile (line 465) để nút bấm không bị sát bottom nav

Tất cả thay đổi chỉ ảnh hưởng mobile, desktop giữ nguyên qua breakpoint `sm:`.

