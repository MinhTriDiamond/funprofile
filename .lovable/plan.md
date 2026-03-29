

## Vấn đề

1. **Không có ScrollToTop component** — App.tsx không có component nào cuộn lên đầu khi chuyển route, nên khi quay lại trang, scroll position có thể bị giữ sai vị trí.

2. **Feed load lại từ đầu khi quay lại** — Feed component bị unmount khi rời trang và remount khi quay lại. Mặc dù `staleTime: 30s` và `gcTime: 5 phút` giúp giữ cache, nhưng component vẫn hiện loading skeleton trong lúc rehydrate, gây cảm giác "load lại từ đầu".

## Kế hoạch sửa

### Bước 1: Thêm ScrollToTop component cho chuyển trang
- Tạo `src/components/ScrollToTop.tsx` — dùng `useLocation()` để cuộn `[data-app-scroll]` hoặc `window` lên đầu mỗi khi pathname thay đổi.
- Đặt trong `<BrowserRouter>` ở `App.tsx`.

### Bước 2: Giữ Feed không hiện loading khi có cache
- Trong `useFeedPosts.ts`, thêm `placeholderData: keepPreviousData` cho infinite query để khi quay lại trang, data từ cache hiển thị ngay thay vì hiện skeleton.
- Sửa Feed.tsx: chỉ hiện skeleton khi `isLoading && !data` (lần đầu load), không hiện khi đã có cache.

### Bước 3: Tăng gcTime cho feed
- Tăng `gcTime` của feed-posts từ 5 phút lên 15 phút để cache sống lâu hơn khi user lướt qua các trang khác rồi quay lại.

### File thay đổi
1. **Tạo mới** `src/components/ScrollToTop.tsx`
2. **Sửa** `src/App.tsx` — import và thêm `<ScrollToTop />` trong `<BrowserRouter>`
3. **Sửa** `src/hooks/useFeedPosts.ts` — tăng gcTime, thêm placeholderData
4. **Sửa** `src/pages/Feed.tsx` — điều kiện hiện skeleton chính xác hơn

