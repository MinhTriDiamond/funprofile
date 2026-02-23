
# Tăng giới hạn dung lượng video live từ 2GB lên 4GB

## Thay đổi

Cập nhật giới hạn `MAX_VIDEO_SIZE` trong edge function `upload-to-r2` từ 2GB lên 4GB.

## Chi tiết kỹ thuật

### File: `supabase/functions/upload-to-r2/index.ts`

- Thay đổi dòng `MAX_VIDEO_SIZE` từ `2 * 1024 * 1024 * 1024` (2GB) thành `4 * 1024 * 1024 * 1024` (4GB)

Chỉ cần thay đổi 1 dòng duy nhất, không ảnh hưởng đến logic upload hay các giới hạn khác (hình ảnh vẫn giữ 100MB).
