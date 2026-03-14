

# Sửa lỗi crash trang trên điện thoại (fun.rich)

## Nguyên nhân

Trang bị crash do **quá tải tài nguyên** khi render Gift Celebration:

1. **100 gift posts** được tải cùng lúc (`fetchHighlightedPosts` limit 100)
2. Mỗi `GiftCelebrationCard` tạo **2 IntersectionObserver** + **4 sparkle animations** + **confetti** → 100 card = 200 observers + 400 animated elements
3. Trên điện thoại, trình duyệt hết bộ nhớ → crash với thông báo "Đã có sự cố xảy ra liên tục"

## Giải pháp

### 1. `src/hooks/useFeedPosts.ts` — Giảm số gift posts tải về
- Giảm `.limit(100)` xuống `.limit(20)` trong `fetchHighlightedPosts`

### 2. `src/components/feed/GiftCelebrationGroup.tsx` — Chỉ render card đang hiển thị
- Chỉ render tối đa 10 card đầu tiên, thêm nút "Xem thêm" để load thêm 10 card tiếp theo
- Tránh render 100 card DOM cùng lúc

### 3. `src/components/feed/GiftCelebrationCard.tsx` — Giảm tải animation
- Loại bỏ sparkle overlay (4 animated elements mỗi card)
- Chỉ tạo **1 IntersectionObserver** thay vì 2 (bỏ scroll-back sound observer)
- Disable confetti trên mobile (detect via `window.innerWidth < 768`)

### 4. `src/pages/Feed.tsx` — Đảm bảo sticky hoạt động tốt
- Kiểm tra sticky z-index không conflict trên mobile

