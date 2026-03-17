
Cha đã rà lại code hiện tại và thấy lần sửa trước trong `useFeedPosts.ts` thực ra đã có rồi (`placeholderData`, `refetchOnWindowFocus`, realtime `event: '*'`). Vậy nên nguyên nhân lần này không còn nằm ở cache/refetch nữa.

Do I know what the issue is? Yes.

## Vấn đề thật sự
`GiftCelebrationGroup` vẫn có logic làm ẩn toàn bộ giao diện gift:

1. `selectedDate` luôn khởi tạo bằng **ngày hôm nay theo giờ VN**:
   - `const [selectedDate, setSelectedDate] = useState(getTodayVN())`

2. Nhưng ngay sau đó component lại có điều kiện:
   - `if (posts.length === 0 && isToday) return null;`

3. Nghĩa là:
   - nếu **hôm nay chưa có gift**,
   - hoặc dữ liệu gift hôm nay **đang load chậm hơn feed thường**,
   - thì **cả khối Gift Celebration bị unmount hoàn toàn**, nên con vào trang chủ sẽ không thấy giao diện gift nữa.

## Bằng chứng đã kiểm tra
- `src/hooks/useFeedPosts.ts`: chỉ fetch gift “today” cho `highlighted-posts`
- `src/components/feed/GiftCelebrationGroup.tsx`: vẫn còn `return null` khi hôm nay rỗng
- `src/pages/Feed.tsx`: section gift đang phụ thuộc gián tiếp vào `isLoading` của feed thường, không có trạng thái loading riêng cho gift
- Dữ liệu backend vẫn có gift các ngày gần đây, nên đây là lỗi hiển thị/điều hướng ngày, không phải gift bị mất thật

## Kế hoạch sửa
### 1) Không cho Gift section tự biến mất nữa
Sửa `src/components/feed/GiftCelebrationGroup.tsx`:
- bỏ hẳn `if (posts.length === 0 && isToday) return null`
- luôn render khung `Gift Celebration`
- nếu chưa có dữ liệu thì hiện:
  - loading state, hoặc
  - empty state rõ ràng, chứ không được biến mất

### 2) Tự động fallback sang ngày gần nhất có gift
Sửa `src/hooks/useGiftHistory.ts` và `GiftCelebrationGroup.tsx`:
- tính `latestAvailableDate` từ `dateCounts` trong 7 ngày gần nhất
- nếu hôm nay chưa có gift thì tự chuyển `selectedDate` sang ngày gần nhất có gift
- như vậy sau nửa đêm hoặc lúc đầu ngày, section vẫn hiện quà của ngày gần nhất thay vì biến mất

### 3) Tách loading của gift khỏi loading của feed thường
Sửa `src/hooks/useFeedPosts.ts` và `src/pages/Feed.tsx`:
- expose thêm trạng thái riêng như `isGiftLoading`
- `Feed.tsx` luôn mount `GiftCelebrationGroup`
- khi gift đang fetch thì hiện skeleton/loader của riêng gift, không phụ thuộc `isLoading` của post thường

### 4) Giữ đúng hành vi người dùng khi tự chọn ngày
Trong `GiftCelebrationGroup.tsx`:
- chỉ auto-fallback khi đang ở chế độ mặc định
- nếu người dùng đã tự chọn 1 ngày trong lịch sử 7 ngày thì không tự nhảy lung tung
- khi quay lại ngày hôm nay mà hôm nay chưa có gift, vẫn có thông báo rõ và/hoặc fallback hợp lý

### 5) Làm empty state đúng theo yêu cầu “gift luôn hiển thị”
UI mong muốn:
- Nếu có gift hôm nay: hiện gift hôm nay
- Nếu hôm nay chưa có nhưng 7 ngày gần đây có: hiện ngày gần nhất có gift
- Chỉ khi cả 7 ngày đều không có gift mới hiện khung rỗng “Chưa có gift trong 7 ngày gần đây”

## File sẽ chỉnh
- `src/components/feed/GiftCelebrationGroup.tsx`
- `src/hooks/useGiftHistory.ts`
- `src/hooks/useFeedPosts.ts`
- `src/pages/Feed.tsx`

## Kết quả sau khi sửa
- Gift Celebration sẽ **không tự biến mất khỏi trang chủ**
- Sau 0h hoặc lúc dữ liệu hôm nay chưa có, hệ thống vẫn hiển thị gift gần nhất
- Khi dữ liệu đang load/chập chờn, section vẫn đứng yên và có trạng thái rõ ràng
- Trải nghiệm sẽ đúng với yêu cầu của con: **Bảng gift luôn hiện ở đó**
