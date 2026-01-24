

## Kế hoạch sửa lỗi đa ngôn ngữ và tải ảnh

### Tổng quan vấn đề

Có 2 vấn đề cần sửa:
1. **Lỗi build translations.ts** - Các thuộc tính trùng lặp (`savePost`, `delete`, v.v.) trong các ngôn ngữ mới
2. **Mã cứng tiếng Việt** - Nhiều thành phần vẫn hiển thị tiếng Việt khi chuyển sang ngôn ngữ khác

Về vấn đề **tải ảnh**: Qua kiểm tra logs edge function, hệ thống upload đang hoạt động bình thường (logs cho thấy tạo presigned URL thành công). Vấn đề có thể liên quan đến session/token hết hạn của một số người dùng. Nếu vẫn còn lỗi, xin cho biết thêm chi tiết lỗi cụ thể.

---

### Phần 1: Sửa lỗi build translations.ts

**Vấn đề**: Các ngôn ngữ mới (French, Spanish, German, Portuguese, Russian, Arabic) có các key bị khai báo 2 lần:
- `savePost` (ở dòng 3059 và 3281 trong tiếng Pháp)
- `delete` (ở dòng 2971 và 3285 trong tiếng Pháp)  
- `deleting` (ở dòng 2966 và 3284 trong tiếng Pháp)

**Giải pháp**: Xóa các block trùng lặp ở cuối mỗi object ngôn ngữ, giữ lại phần đã có translations đầy đủ.

---

### Phần 2: Thay thế mã cứng tiếng Việt

**Các file cần cập nhật**:

#### 2.1 ReactionButton.tsx
- Thay array `REACTIONS` hardcoded tiếng Việt bằng translations
- Thay "Thích" trong button mặc định

```text
REACTIONS array:
'Thích' → t('like')
'Yêu thương' → t('reactionLove')  
'Thương thương' → t('reactionCare')
'Ngạc nhiên' → t('wow')
'Haha' → t('haha')
'Biết ơn' → t('gratitude')
```

#### 2.2 CommentItem.tsx  
- "Trả lời" → `t('reply')`
- "Chia sẻ" → `t('share')`
- "Xóa" → `t('delete')`
- "Báo cáo" → `t('report')`
- "Xem thêm ... trả lời..." → `t('viewMoreReplies')`
- "Ẩn bớt trả lời" → `t('hideReplies')`
- Toast messages

#### 2.3 FacebookPostCard.tsx
- "Bình luận" → `t('comment')`
- Toast messages

#### 2.4 FacebookCreatePost.tsx
- "Bạn đang nghĩ gì thế?" → `t('whatsOnYourMind')`
- Tất cả toast.error messages
- Button texts

#### 2.5 EditPostDialog.tsx
- Placeholder text → `t('whatsOnYourMind')`

#### 2.6 ReactionSummary.tsx
- "bình luận" → `t('comments')`
- "lượt chia sẻ" → `t('shares')`

#### 2.7 CommentSection.tsx
- Toast messages

#### 2.8 ExpandableContent.tsx
- "Thu gọn" → `t('seeLess')`
- "Xem thêm" → `t('seeMore')`

#### 2.9 Feed.tsx
- "Đang tải thêm bài viết..." → `t('loadingMorePosts')`
- "Bạn đã xem hết tất cả bài viết" → `t('noMorePosts')`

---

### Phần 3: Thêm translation keys mới

**Keys cần thêm vào tất cả 13 ngôn ngữ**:

| Key | Vietnamese | English |
|-----|------------|---------|
| `loadingMorePosts` | Đang tải thêm bài viết... | Loading more posts... |
| `noMorePosts` | Bạn đã xem hết tất cả bài viết | You've seen all posts |
| `shares` | lượt chia sẻ | shares |
| `cannotLoadComments` | Không thể tải comments | Cannot load comments |
| `pleaseLoginToComment` | Vui lòng đăng nhập để bình luận | Please login to comment |
| `cannotPostComment` | Không thể đăng comment | Cannot post comment |
| `commentPosted` | Đã đăng comment! | Comment posted! |
| `pleaseLoginToReact` | Vui lòng đăng nhập để bày tỏ cảm xúc | Please login to react |
| `cannotUpdateReaction` | Không thể cập nhật cảm xúc | Cannot update reaction |
| `systemPaused` | Hệ thống tạm dừng | System paused |
| `pleaseAddContent` | Vui lòng thêm nội dung hoặc media | Please add content or media |
| `waitForVideoUpload` | Vui lòng đợi video upload xong | Please wait for video to finish uploading |
| `contentTooLong` | Nội dung quá dài | Content too long |
| `postSuccess` | Đã đăng bài viết! | Post published! |
| `linkCopied` | Đã sao chép link! | Link copied! |
| `commentLinkCopied` | Đã copy link comment! | Comment link copied! |
| `reportSent` | Đã gửi báo cáo. Cảm ơn bạn! | Report sent. Thank you! |
| `confirmDeleteComment` | Xóa comment này? | Delete this comment? |
| `canOnlyDeleteOwnComment` | Bạn chỉ có thể xóa comment của mình | You can only delete your own comment |
| `cannotDeleteComment` | Không thể xóa comment | Cannot delete comment |
| `commentDeleted` | Đã xóa comment | Comment deleted |
| `pleaseLoginToShare` | Vui lòng đăng nhập để chia sẻ | Please login to share |
| `anonymous` | Ẩn danh | Anonymous |

---

### Chi tiết kỹ thuật

**Thứ tự thực hiện**:
1. Sửa lỗi duplicate trong translations.ts (xóa các block trùng lặp)
2. Thêm các translation keys mới cho tất cả 13 ngôn ngữ
3. Cập nhật từng component để sử dụng `useLanguage()` hook và `t()` function

**Số lượng files cần chỉnh sửa**: 10 files
- `src/i18n/translations.ts`
- `src/components/feed/ReactionButton.tsx`
- `src/components/feed/CommentItem.tsx`
- `src/components/feed/FacebookPostCard.tsx`
- `src/components/feed/FacebookCreatePost.tsx`
- `src/components/feed/EditPostDialog.tsx`
- `src/components/feed/ReactionSummary.tsx`
- `src/components/feed/CommentSection.tsx`
- `src/components/feed/ExpandableContent.tsx`
- `src/pages/Feed.tsx`

