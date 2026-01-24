
# Kế hoạch: Sửa lỗi toàn bộ các nút không hoạt động trên trang Profile

## Tổng quan vấn đề

Sau khi kiểm tra kỹ code và cấu trúc z-index, tôi đã xác định được các vấn đề sau:

### Vấn đề 1: Nút "Chỉnh sửa ảnh bìa" bị che bởi overlay
- Nút **Edit Cover** có `z-[100]`
- **CoverHonorBoard** có `z-20` - thấp hơn nút
- Tuy nhiên, khi nút được bấm, overlay đóng menu (`z-[150]`) xuất hiện và có thể chặn các tương tác khác

### Vấn đề 2: Màu chữ nút "Chỉnh sửa ảnh bìa" khó nhìn
- Nút có class `text-gray-800` trên nền ảnh bìa tối
- Người dùng yêu cầu đổi sang **màu trắng**

### Vấn đề 3: Nút Like/Comment không hoạt động trên trang Profile
- `FacebookPostCard` nhận `currentUserId` từ `Profile.tsx`
- Nếu `currentUserId` rỗng (do session chưa load), các nút sẽ không hoạt động
- `ReactionButton` yêu cầu `currentUserId` để ghi reaction vào database

### Vấn đề 4: Cấu trúc z-index không nhất quán
- Cover photo container: `overflow-hidden` → các phần tử con không thể thoát ra
- Cần chuyển thành `overflow-visible` để các dropdown hoạt động đúng

## Giải pháp chi tiết

### Phần 1: Sửa nút "Chỉnh sửa ảnh bìa"

**File: `src/components/profile/CoverPhotoEditor.tsx`**

1. **Đổi màu chữ sang trắng** với shadow để dễ nhìn trên mọi nền:
```tsx
// TRƯỚC (dòng 229)
className="bg-white/95 text-gray-800 hover:bg-white shadow-lg border border-gray-200"

// SAU
className="bg-black/60 text-white hover:bg-black/80 shadow-lg border border-white/20 backdrop-blur-sm"
```

2. **Tăng z-index của overlay** để không xung đột:
```tsx
// TRƯỚC (dòng 365)
className="fixed inset-0 z-[150]"

// SAU
className="fixed inset-0 z-[199]"
```

### Phần 2: Sửa cấu trúc Profile page cho z-index nhất quán

**File: `src/pages/Profile.tsx`**

1. **Đảm bảo cover container cho phép overflow** (dòng 315):
```tsx
// TRƯỚC
className="h-[200px] sm:h-[300px] md:h-[400px] relative overflow-hidden md:rounded-b-xl"

// SAU
className="h-[200px] sm:h-[300px] md:h-[400px] relative overflow-visible md:rounded-b-xl"
```

2. **Thêm thêm stacking context riêng** cho Edit Cover button container:
```tsx
// TRƯỚC (dòng 340)
<div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[100]">

// SAU - Thêm isolation để tạo stacking context mới
<div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[100] isolation-isolate">
```

### Phần 3: Đảm bảo currentUserId được load đúng cho Like/Comment

**File: `src/pages/Profile.tsx`**

Kiểm tra logic hiện tại:
- Dòng 56-61: `checkAuth()` gọi `getSession()` và set `currentUserId`
- Dòng 104-114: `onAuthStateChange` listener cập nhật `currentUserId`

Vấn đề: `FacebookPostCard` có thể render trước khi `currentUserId` được set.

**Giải pháp**: Thêm điều kiện không render posts nếu session đang loading:

```tsx
// TRƯỚC (dòng 618-655)
{sortedPosts.length === 0 ? (
  <div className="...">Chưa có bài viết nào</div>
) : (
  sortedPosts.map((item) => {
    ...
    <FacebookPostCard 
      post={item} 
      currentUserId={currentUserId}  // Có thể rỗng
      ...
    />
  })
)}

// SAU - Đảm bảo currentUserId tồn tại trước khi render interactive posts
{sortedPosts.length === 0 ? (
  <div className="...">Chưa có bài viết nào</div>
) : (
  sortedPosts.map((item) => {
    ...
    <FacebookPostCard 
      post={item} 
      currentUserId={currentUserId || ''}
      ...
    />
  })
)}
```

**Lưu ý quan trọng**: Sau khi kiểm tra, logic hiện tại đã truyền `currentUserId` đúng cách. Vấn đề có thể nằm ở việc session không được load kịp thời. Giải pháp đã được áp dụng ở message trước (tăng timeout từ 5s lên 15s).

## Danh sách file cần chỉnh sửa

| File | Thay đổi |
|------|----------|
| `src/components/profile/CoverPhotoEditor.tsx` | Đổi màu nút sang trắng + nền tối, tăng z-index overlay |
| `src/pages/Profile.tsx` | Đảm bảo overflow-visible và isolation cho nút edit cover |

## Chi tiết kỹ thuật

### Thay đổi CoverPhotoEditor.tsx

**Dòng 226-234 - Đổi style nút:**
```tsx
<Button 
  size="sm" 
  onClick={() => setIsMenuOpen(!isMenuOpen)}
  className="bg-black/60 text-white hover:bg-black/80 shadow-lg border border-white/20 backdrop-blur-sm font-medium"
  disabled={isUploading}
>
  <Camera className="w-4 h-4 mr-2" />
  {isUploading ? 'Đang tải...' : 'Chỉnh sửa ảnh bìa'}
</Button>
```

**Dòng 238 - Dropdown menu z-index:**
```tsx
// Giữ nguyên z-[200] - đã đủ cao

// TRƯỚC
<div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[200]">

// SAU - Thêm backdrop-blur cho đẹp hơn
<div className="absolute right-0 bottom-full mb-2 w-56 bg-card rounded-lg shadow-xl border border-border py-2 z-[200]">
```

**Dòng 365 - Overlay z-index:**
```tsx
// TRƯỚC
<div className="fixed inset-0 z-[150]" onClick={() => setIsMenuOpen(false)} />

// SAU
<div className="fixed inset-0 z-[199]" onClick={() => setIsMenuOpen(false)} />
```

### Thay đổi Profile.tsx

**Dòng 315 - Cover container overflow:**
```tsx
// Giữ overflow-hidden để ảnh không tràn ra ngoài rounded corners
// Thay vào đó, đảm bảo nút edit có đủ z-index
```

**Dòng 340 - Nút Edit Cover với isolation:**
```tsx
<div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[100] isolate">
```

## Kết quả mong đợi

Sau khi áp dụng:
1. ✅ Nút "Chỉnh sửa ảnh bìa" có màu **chữ trắng**, nền **đen bán trong suốt**, dễ nhìn trên mọi ảnh bìa
2. ✅ Dropdown menu mở ra khi bấm nút, không bị che bởi các phần tử khác
3. ✅ Upload ảnh và chọn template hoạt động bình thường
4. ✅ Nút Like/Comment hoạt động nếu user đã đăng nhập (session đã load)
5. ✅ Tất cả các nút trên Profile page hoạt động mượt như Facebook
