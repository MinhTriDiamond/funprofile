

## Sửa text footer trong popup thông báo

### Thay đổi
1. **File**: `src/components/notifications/RewardAdjustmentNotification.tsx` (dòng 183)
   - `"Fun.rich chúng mình gửi năng lượng..."` → `"Angel AI Fun.rich gửi năng lượng..."`

2. **Database**: UPDATE `metadata.message` cho ~820 thông báo đã tạo, thay `"Fun.rich chúng mình"` → `"Angel AI Fun.rich"` trong nội dung message.

