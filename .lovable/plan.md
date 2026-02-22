

# Tối ưu tốc độ tải trang User Profile

## Phân tích nguyên nhân chậm

Sau khi kiểm tra code, có **3 nguyên nhân chính** gây chậm:

### 1. Waterfall queries trong Profile page (Nguyên nhân chính)
Hàm `fetchProfile` trong `src/pages/Profile.tsx` thực hiện **6 truy vấn tuần tự** (query xong cái này mới query cái kia):
1. Lấy profile
2. Lấy bài viết gốc
3. Lấy bài gift celebration
4. Lấy profile gift recipients
5. Lấy bài share
6. Lấy danh sách bạn bè + profile bạn bè

Mỗi query mất 200-500ms, tổng cộng 1.5-3 giây chờ tuần tự. Nếu mạng chậm hoặc server bận, có thể lên 5-10 giây.

### 2. Infinite re-render loop trong useTokenBalances
Console log cho thấy lỗi **"Maximum update depth exceeded"** từ `useTokenBalances.ts` (dòng 126). Hook này gọi `setState` trong `useEffect` tạo vòng lặp vô hạn, gây lag toàn bộ app.

### 3. Không có cache/React Query cho Profile page
Profile page dùng `useState` + `useEffect` thay vì React Query, nên mỗi lần vào trang đều phải load lại từ đầu, không có cache.

## Kế hoạch sửa

### Buoc 1: Fix infinite loop trong useTokenBalances
**File:** `src/hooks/useTokenBalances.ts`
- Sửa hàm `fetchPrices` bị thiếu dependency ổn định trong `useCallback`, gây re-render loop
- Tách `setPrices` + `setLastPrices` ra khỏi dependency chain của `useCallback`
- Thêm ref để track giá trị `lastPrices` thay vì dùng state dependency

### Buoc 2: Song song hóa queries trong Profile page
**File:** `src/pages/Profile.tsx`
- Chuyển từ query tuần tự sang `Promise.all` cho các query độc lập
- Nhóm 1 (chạy song song ngay): profile + posts + gift posts + shared posts + friends
- Nhóm 2 (chạy sau khi có kết quả): gift profiles (cần biết recipient IDs trước)

Giảm từ 6 bước tuần tự xuống còn 2 bước, tiết kiệm 60-70% thời gian.

### Buoc 3: Thêm React Query cache cho Profile data
**File:** `src/pages/Profile.tsx`
- Wrap `fetchProfile` bằng `useQuery` với `staleTime: 2 phút`
- Lần vào lại trang sẽ hiển thị cache ngay lập tức, đồng thời refetch ngầm
- Giữ Pull-to-refresh hoạt động bằng `queryClient.invalidateQueries`

## Chi tiet ky thuat

### Waterfall hien tai vs Song song moi:

Hien tai (tuan tu):
```text
Profile -----> Posts -----> Gift Posts -----> Gift Profiles -----> Shared Posts -----> Friends
  300ms         400ms         300ms              200ms                400ms              300ms
                                                                            Total: ~1900ms
```

Sau khi toi uu (song song):
```text
Profile --|
Posts ----|----> Gift Profiles ---> Done
Gift Posts|        200ms
Shared ---|
Friends --|
   400ms              
                Total: ~600ms
```

### Fix useTokenBalances:
- Dung `useRef` cho `lastPrices` thay vi `useState` de tranh re-render loop
- Dam bao `fetchPrices` callback on dinh, khong thay doi moi render

Tong cong thay doi 2 file, khong can them server hay thay doi database.

