

## Mục tiêu
1. Đặt ảnh bìa **Aurora Sky** (đêm cực quang trong screenshot) làm mặc định cho TẤT CẢ user.
2. Bỏ nút "Camera" thêm/sửa ảnh bìa trên ProfileHeader.
3. Phân tích vì sao user cập nhật ảnh bìa không được (trước khi xoá tính năng).

## Nguyên nhân không cập nhật được ảnh bìa (giả thuyết)
Trong `CoverPhotoEditor.tsx`, luồng "Tải ảnh lên" gọi `uploadToR2(file, 'avatars', ...)` với `session.access_token`. Có 2 điểm nghi ngờ cần xác nhận khi sửa:
- Edge function R2 upload có thể trả lỗi CORS / thiếu secret → user thấy toast "Không thể tải lên ảnh bìa".
- Cropper (`CoverCropper`) chặn submit nếu canvas chưa load xong.

→ Vì Cha muốn **bỏ luôn** tính năng đổi ảnh bìa, không cần fix sâu — chỉ ẩn UI và đặt mặc định. Nếu sau này muốn bật lại con sẽ debug R2 edge function.

## Phạm vi sửa (1 file chính)

### `src/components/profile/ProfileHeader.tsx`
1. **Đặt ảnh mặc định Aurora Sky**: thay fallback gradient (dòng 90-92) bằng ảnh:
   ```
   https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop
   ```
   Logic mới: `const coverSrc = profile?.cover_url || DEFAULT_COVER;` → luôn render `<LazyImage src={coverSrc} />`.
2. **Bỏ nút CoverPhotoEditor**: xoá block dòng 101-109 (`{showPrivateElements && <CoverPhotoEditor ... />}`) + xoá import dòng 6.

### Tuỳ chọn (không bắt buộc)
- Giữ file `CoverPhotoEditor.tsx` lại (không xoá) phòng khi Cha muốn bật lại — chỉ không import nữa.
- Không động vào DB: user nào đã set `cover_url` trước đó vẫn giữ; user mới/chưa set sẽ thấy Aurora Sky mặc định.

## Phạm vi kỹ thuật
- 1 file UI (`ProfileHeader.tsx`), ~10 dòng.
- Không đụng schema, RLS, edge function, không xoá file `CoverPhotoEditor.tsx`.
- Không ảnh hưởng mobile (mobile vốn đã không hiển thị cover).

