

# Cập nhật tiếng Việt có dấu cho trang đăng bài

## Vấn đề
Component `FacebookCreatePost.tsx` và `Post.tsx` có nhiều chuỗi tiếng Việt được viết trực tiếp (hardcoded) thay vì sử dụng hệ thống đa ngôn ngữ `t()`. Điều này khiến:
- Khi người dùng chuyển sang ngôn ngữ khác, vẫn thấy tiếng Việt
- Không thống nhất với phần còn lại của ứng dụng

## Phạm vi thay đổi

### 1. Thêm translation keys mới vào `src/i18n/translations.ts`

Thêm các key cho tất cả chuỗi hardcoded trong flow đăng bài:

| Key | Tiếng Anh | Tiếng Việt |
|-----|-----------|------------|
| `uploadFailed` | Upload failed | Upload thất bại |
| `fileNotSupported` | File not supported | File không được hỗ trợ |
| `imageTooLarge` | Image must be smaller than 100MB | Ảnh phải nhỏ hơn 100MB |
| `videoTooLarge` | Video must be smaller than 10GB | Video phải nhỏ hơn 10GB |
| `videoTooLong` | Video must be shorter than 120 minutes | Video phải ngắn hơn 120 phút |
| `cannotReadVideo` | Cannot read video | Không thể đọc video |
| `onlyOneVideoAtATime` | Only 1 video can be uploaded at a time | Chỉ có thể upload 1 video mỗi lần |
| `videosSkipped` | other videos skipped | video khác bị bỏ qua |
| `uploadingLeaveWarning` | Uploading. Are you sure you want to leave? | Đang tải lên. Bạn có chắc muốn rời đi? |
| `waitForFileUpload` | Please wait for files to finish uploading | Vui lòng đợi file upload xong |
| `contentTooLongDetail` | Content too long | Nội dung quá dài |
| `authenticating` | Authenticating... | Đang xác thực... |
| `preparingMedia` | Preparing media... | Đang chuẩn bị media... |
| `savingPost` | Saving post... | Đang lưu bài viết... |
| `uploadingVideo` | Uploading video... | Đang upload video... |
| `posting` | Posting... | Đang đăng... |
| `postButton` | Post | Đăng |
| `cancelButton` | Cancel | Huỷ |
| `sessionExpired` | Session expired. Please reload and login again. | Phiên đăng nhập hết hạn. Vui lòng tải lại trang và đăng nhập lại. |
| `postTimeout` | Post timed out, please try again | Đăng bài bị timeout, vui lòng thử lại |
| `cancelledPost` | Post cancelled | Đã huỷ đăng bài |
| `cannotPost` | Cannot post | Không thể đăng bài |
| `serverConnectionError` | Server connection error | Lỗi kết nối với server |
| `cannotSavePost` | Cannot save post | Không thể lưu bài viết |
| `duplicatePostMessage` | Post published! However, this content is similar to a previous post so no additional rewards. Create new content to spread more Light! | Bài viết đã được đăng! Tuy nhiên, nội dung này tương tự một bài trước đó nên không được tính thưởng thêm. Hãy sáng tạo nội dung mới để lan tỏa Ánh Sáng nhiều hơn nhé! |
| `loginToPostMessage` | Please login to post | Vui lòng đăng nhập để đăng bài |
| `loginButton` | Login | Đăng nhập |
| `liveVideo` | Live video | Video trực tiếp |
| `photoVideo` | Photo/Video | Ảnh/video |
| `feelingActivity` | Feeling/Activity | Cảm xúc/hoạt động |
| `addToYourPost` | Add to your post | Thêm vào bài viết của bạn |
| `addPhotoVideo` | Add photo/video | Thêm ảnh/video |
| `dragAndDrop` | or drag and drop | hoặc kéo và thả |
| `maxFiles` | max files | tối đa file |
| `chooseFromDevice` | Choose from device | Chọn từ thiết bị |
| `readyToPost` | Ready to post | Sẵn sàng đăng |
| `tagFriends` | Tag friends | Gắn thẻ bạn bè |
| `gifComingSoon` | GIF (Coming soon) | GIF (Sắp có) |
| `more` | More | Thêm |
| `feelingPrefix` | is feeling | đang cảm thấy |
| `withPrefix` | with | cùng với |
| `andOthers` | and others | và người khác |
| `atPrefix` | at | tại |
| `postNotFound` | Post not found | Bài viết không tồn tại |
| `postNotFoundDesc` | This post may have been deleted or you don't have permission to view it. | Bài viết này có thể đã bị xóa hoặc bạn không có quyền xem. |
| `backToHome` | Back to home | Về trang chủ |
| `goBack` | Go back | Quay lại |
| `relatedPosts` | Related posts | Bài viết liên quan |
| `featureInDevelopment` | Feature in development | Chức năng đang phát triển |

Cũng thêm tương ứng cho các ngôn ngữ khác (zh, ja, ko, th).

### 2. Cập nhật `src/components/feed/FacebookCreatePost.tsx`

Thay tất cả chuỗi hardcoded bằng `t('key')`:
- Toast messages (error, info, success)
- Button labels (Đăng, Huỷ, Chọn từ thiết bị...)
- Dialog title (Tạo bài viết)
- Placeholder text
- Status text (Sẵn sàng đăng, Thêm vào bài viết...)
- Feeling/tag/location prefixes (đang cảm thấy, cùng với, tại)

### 3. Cập nhật `src/pages/Post.tsx`

Thay các chuỗi hardcoded:
- "Bài viết không tồn tại" -> `t('postNotFound')`
- "Quay lại" -> `t('goBack')`
- "Về trang chủ" -> `t('backToHome')`
- "Bài viết liên quan" -> `t('relatedPosts')`
- "Chức năng đang phát triển" -> `t('featureInDevelopment')`

### 4. Cập nhật `src/pages/Feed.tsx`

Thay chuỗi hardcoded duy nhất còn lại:
- "Chưa có bài viết nào" -> `t('noPostsYet')` (key đã tồn tại)

## Ghi chú kỹ thuật
- Không thay đổi logic, chỉ thay chuỗi text
- Import `useLanguage` vào `Post.tsx` (hiện chưa có)
- Tổng cộng 3 file cần sửa code + 1 file translations

