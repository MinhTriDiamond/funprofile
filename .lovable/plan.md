
# Sửa lỗi: Giao dịch hàng loạt không tự cập nhật + Xoá bài chậm/lỗi

## Nguyên nhân gốc

### Vấn đề 1: Danh sách không tự cập nhật sau khi tặng hàng loạt

Có **2 lỗi** trong hàm `invalidateDonationCache`:

1. **Sai query key**: Cả `UnifiedGiftSendDialog.tsx` (dòng 648) và `useDonationFlow.ts` (dòng 62) đều invalidate key `['feed']`, nhưng feed thực tế dùng key `['feed-posts']`. Nên feed **không bao giờ refresh** sau khi tặng.

2. **Thiếu dispatch event**: Hook `useDonationHistory` lắng nghe sự kiện `'invalidate-donations'` và `useFeedPosts` lắng nghe `'invalidate-feed'`, nhưng **không có chỗ nào dispatch** những sự kiện này từ luồng tặng quà. Nên các trang khác đang mở sẽ không cập nhật.

### Vấn đề 2: Xoá bài chậm / có lúc lỗi

`FacebookPostCard` xoá video từ R2/Stream (gọi API mạng) **TRƯỚC** khi xoá record trong database. Nếu API xoá video chậm hoặc lỗi, UI bị block và có thể thất bại hoàn toàn dù bài viết vẫn còn trong DB.

## Giải pháp

### 1. Sửa query key và thêm dispatch event

**Files**: `src/components/donations/UnifiedGiftSendDialog.tsx` + `src/components/donations/gift-dialog/useDonationFlow.ts`

- Đổi `['feed']` thanh `['feed-posts']`
- Thêm `queryClient.invalidateQueries({ queryKey: ['admin-donation-history'] })` (cho trang Donations)
- Thêm `window.dispatchEvent(new Event('invalidate-feed'))` và `window.dispatchEvent(new Event('invalidate-donations'))` để các trang đang mở cũng cập nhật

### 2. Tối ưu xoá bài viết

**File**: `src/components/feed/FacebookPostCard.tsx`

- Xoá record DB **trước** (nhanh, cập nhật UI ngay)
- Sau đó xoá video R2/Stream **trong background** (không block UI)
- Nếu xoá video thất bại, bài đã bị xoá rồi nên không ảnh hưởng người dùng

## Chi tiết kỹ thuật

### invalidateDonationCache (cả 2 file)
```text
Trước:
  queryClient.invalidateQueries({ queryKey: ['feed'] });

Sau:
  queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
  queryClient.invalidateQueries({ queryKey: ['admin-donation-history'] });
  window.dispatchEvent(new Event('invalidate-feed'));
  window.dispatchEvent(new Event('invalidate-donations'));
```

### FacebookPostCard delete flow
```text
Trước:
  1. deleteStreamVideos() -- chậm, có thể lỗi
  2. deleteStorageFile() -- chậm  
  3. supabase.from('posts').delete() -- nhanh
  4. toast + onPostDeleted()

Sau:
  1. supabase.from('posts').delete() -- nhanh, UI cập nhật ngay
  2. toast + onPostDeleted()
  3. (background) deleteStreamVideos() -- không block
  4. (background) deleteStorageFile() -- không block
```

### Files thay đổi
1. `src/components/donations/UnifiedGiftSendDialog.tsx` -- Sửa query key + thêm dispatch
2. `src/components/donations/gift-dialog/useDonationFlow.ts` -- Sửa query key + thêm dispatch  
3. `src/components/feed/FacebookPostCard.tsx` -- Đảo thứ tự xoá: DB trước, video sau (background)
