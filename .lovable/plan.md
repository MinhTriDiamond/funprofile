
Mục tiêu: sửa toàn bộ các nút và luồng upload đang “bấm không ăn” ở Trang cá nhân (ảnh bìa, chỉnh sửa chi tiết, xem tất cả ảnh, xem bạn bè thật) và sửa lỗi đăng ảnh/video (đăng bài, chỉnh sửa bài, upload media comment) đang thất bại.

## 1) Chẩn đoán nhanh (từ code hiện tại)
### 1.1. Các nút “Chỉnh sửa chi tiết / Xem tất cả ảnh / Xem tất cả bạn bè” không hoạt động
Trong `src/pages/Profile.tsx`, các nút này đang dùng:
- `document.querySelector('[value="edit"]')` hoặc tương tự để “click” vào tab.

Nhưng `TabsTrigger` (Radix Tabs) không render attribute `value="..."` ra DOM; nó dùng `data-value`. Vì vậy `querySelector('[value="edit"]')` thường trả về `null` → click không có tác dụng.

Kết luận: đây là nguyên nhân chính khiến “bấm không ăn” ở các nút chuyển tab.

### 1.2. Upload ảnh bìa / avatar / chỉnh sửa bài / comment media / (một số trường hợp) đăng ảnh bị lỗi
Hệ thống upload R2 (`uploadToR2`) có hỗ trợ truyền `accessToken` để tránh race-condition “401 Unauthorized”.

Hiện tại nhiều nơi gọi `uploadToR2(...)` mà KHÔNG truyền `accessToken`, gồm:
- `src/components/profile/CoverPhotoEditor.tsx`
- `src/components/profile/AvatarEditor.tsx`
- `src/components/profile/EditProfile.tsx`
- `src/components/feed/EditPostDialog.tsx`
- `src/components/feed/CommentMediaUpload.tsx`

Trong khi `FacebookCreatePost.tsx` đã làm đúng (lấy session một lần và truyền `session.access_token`).

Kết luận: đây là nguyên nhân chính khiến “tải ảnh lên/đăng ảnh” lúc được lúc không hoặc thất bại.

### 1.3. “Xem bạn bè” không thấy bạn bè thật
- Tab “Bạn bè” (`<FriendsList userId={profile.id} />`) là dữ liệu thật.
- Nhưng khu preview “Bạn bè” ở sidebar đang là placeholder (mảng [1..6]).
- Ngoài ra do lỗi chuyển tab (mục 1.1), người dùng không vào được tab bạn bè nên tưởng hệ thống không có bạn bè.

Kết luận: cần (a) sửa chuyển tab; (b) thay placeholder preview bằng dữ liệu thật (top 6 bạn bè).

## 2) Hướng triển khai sửa lỗi (không phụ thuộc DOM querySelector)
### 2.1. Chuyển Tabs sang “controlled tabs”
File: `src/pages/Profile.tsx`

- Tạo state `activeTab` (ví dụ mặc định `'posts'`)
- Render Tabs dạng controlled:
  - `<Tabs value={activeTab} onValueChange={setActiveTab} ...>`
- Tất cả nút “Chỉnh sửa chi tiết / Xem tất cả ảnh / Xem tất cả bạn bè” đổi sang gọi thẳng:
  - `setActiveTab('edit')`, `setActiveTab('photos')`, `setActiveTab('friends')`
- (Tuỳ chọn UX) Sau khi set tab, scroll đến khu tabs cho người dùng thấy ngay:
  - `document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`

Kết quả mong đợi: bấm nút là chuyển tab chắc chắn, không phụ thuộc DOM structure.

### 2.2. Hiển thị “Bạn bè thật” ở card preview bên trái (thay placeholder)
File: `src/pages/Profile.tsx`

- Thêm state `friendsPreview: Array<{id, username, full_name, avatar_url}>`
- Khi `fetchProfile(profileId)` chạy xong (hoặc song song), thêm hàm `fetchFriendsPreview(profileId)`:
  1) Query `friendships` status `accepted` cho user
  2) Tạo list friendIds (lấy “người còn lại” trong mỗi record)
  3) Query `profiles` theo `.in('id', friendIds)` lấy basic info
  4) Lấy tối đa 6 bạn để render grid (avatar + tên)
- Render grid thay cho placeholder `[1..6]`. Nếu không có bạn bè thì giữ thông báo “Chưa có bạn bè”.

Kết quả mong đợi: ngay cả trước khi bấm “Xem tất cả bạn bè”, sidebar đã thấy bạn bè thật.

## 3) Sửa toàn bộ luồng upload bị lỗi bằng cách truyền access token
Nguyên tắc: mỗi “lần upload” sẽ lấy session 1 lần → truyền `session.access_token` vào `uploadToR2(...)`.

### 3.1. Cover photo upload
File: `src/components/profile/CoverPhotoEditor.tsx`
- Trong `handleFileSelect`:
  - gọi `const { data: { session } } = await supabase.auth.getSession()`
  - nếu không có session → toast yêu cầu đăng nhập
  - gọi `uploadToR2(compressedFile, 'avatars', customPath?, session.access_token)`
- Nới/đồng bộ giới hạn size:
  - hiện đang hardcode 5MB; sẽ chuyển sang dùng `FILE_LIMITS.IMAGE_MAX_SIZE` (để không chặn ảnh lớn vô lý), vì ta đã nén trước khi upload.
  - (Nếu muốn vẫn giới hạn cover thấp hơn) thì đặt một constant rõ ràng, ví dụ 100MB, và toast message đúng.

Kết quả mong đợi: bấm “Tải ảnh lên” → chọn file → upload thành công ổn định.

### 3.2. Avatar upload
File: `src/components/profile/AvatarEditor.tsx`
- Trong `handleCropComplete`:
  - lấy session
  - gọi `uploadToR2(file, 'avatars', path, session.access_token)`

### 3.3. EditProfile tab (trong trang cá nhân) – avatar & cover
File: `src/components/profile/EditProfile.tsx`
- `handleCropComplete` và `handleCoverUpload`:
  - lấy session
  - gọi `uploadToR2(..., session.access_token)`

### 3.4. Edit post (Chỉnh sửa bài viết) – upload ảnh mới
File: `src/components/feed/EditPostDialog.tsx`
- Trong `handleSubmit`:
  - lấy session 1 lần
  - khi `imageFile` tồn tại → `uploadToR2(imageFile, 'posts', undefined, session.access_token)`
- Lưu ý: video dùng Uppy nên không liên quan `uploadToR2`.

### 3.5. Upload media trong comment
File: `src/components/feed/CommentMediaUpload.tsx`
- Hiện chỉ `getUser()` (không lấy access_token), cần:
  - `const { data: { session } } = await supabase.auth.getSession()`
  - truyền `session.access_token` vào `uploadToR2(fileToUpload, 'comment-media', undefined, session.access_token)`

## 4) Những nút khác “đang lỗi” trong trang cá nhân
Sau khi sửa controlled tabs + upload token, sẽ rà lại các điểm click dễ hỏng trong `Profile.tsx`:
- Nút icon bút (`PenSquare`) ở “Thông tin cá nhân”
- Nút “Chỉnh sửa chi tiết”
- “Xem tất cả ảnh” và click vào ảnh trong grid preview
- “Xem tất cả bạn bè”
Tất cả sẽ thống nhất dùng `setActiveTab(...)` + scrollIntoView.

## 5) Tiêu chí nghiệm thu (checklist)
1) Ở trang cá nhân:
   - Bấm “Chỉnh sửa chi tiết” → tab edit mở ra và thấy form sửa hồ sơ.
   - Bấm “Xem tất cả ảnh” → tab ảnh mở ra.
   - Bấm “Xem tất cả bạn bè” → tab bạn bè mở ra.
2) Card “Bạn bè” bên trái hiển thị avatar + tên bạn bè thật (tối đa 6).
3) Upload ảnh bìa:
   - Bấm “Chỉnh sửa ảnh bìa” → “Tải ảnh lên” → chọn ảnh → ảnh bìa cập nhật.
4) Đăng bài kèm ảnh:
   - Chọn ảnh → đăng bài → bài tạo thành công.
5) Chỉnh sửa bài viết:
   - Mở menu bài → “Chỉnh sửa bài viết” → đổi ảnh → lưu → cập nhật thành công.
6) Comment upload ảnh/video:
   - Upload thành công và hiện preview.

## 6) Files dự kiến sẽ chỉnh
- `src/pages/Profile.tsx` (controlled tabs + fix click handlers + friends preview real data)
- `src/components/profile/CoverPhotoEditor.tsx` (pass access token + size rule)
- `src/components/profile/AvatarEditor.tsx` (pass access token)
- `src/components/profile/EditProfile.tsx` (pass access token cho avatar/cover trong tab edit)
- `src/components/feed/EditPostDialog.tsx` (pass access token khi upload ảnh)
- `src/components/feed/CommentMediaUpload.tsx` (pass access token khi upload)

## 7) Rủi ro & cách giảm rủi ro
- Nếu người dùng chưa đăng nhập: các action upload sẽ bị chặn. Sẽ thêm toast rõ ràng (“Vui lòng đăng nhập để tải ảnh”).
- Nếu ảnh cực lớn: nén client-side có thể chậm. Sẽ hiển thị toast loading khi nén (đã có ở một số nơi) và đảm bảo không hard-block ở 5MB trước khi nén.

Nếu bạn muốn, sau khi sửa xong mình cũng có thể làm thêm “click ảnh trong tab Ảnh mở phóng to (lightbox)” cho trải nghiệm giống Facebook hơn.
