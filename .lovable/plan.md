

# Thay Video Nền Hoa Mai Bằng Video Valentine

## Thay Đổi

Thay thế video nền hoa mai/đào (`tet-background.mp4`) bằng video Valentine mới (`valen.mp4`) trên toàn bộ ứng dụng.

### Các bước thực hiện:

1. **Copy file video mới** vào `src/assets/valen.mp4`

2. **Cập nhật `src/components/ui/TetBackground.tsx`**:
   - Thay import từ `tet-background.mp4` sang `valen.mp4`
   - Cập nhật comment mô tả component cho phù hợp (Valentine theme)

### Chi tiết kỹ thuật

- File `TetBackground.tsx` hiện import video từ `@/assets/tet-background.mp4`
- Chỉ cần đổi dòng import sang file mới: `import bgVideo from '@/assets/valen.mp4'`
- Component `TetFlowerOverlay.tsx` (hiệu ứng glow hoa mai) cũng sẽ được cập nhật comment cho đúng theme
- Không cần thay đổi logic hay layout -- video mới sẽ tự động hiển thị ở tất cả các trang đang dùng `TetBackground`

### File cần sửa:
| File | Thay đổi |
|------|----------|
| `src/assets/valen.mp4` | Copy file video mới vào đây |
| `src/components/ui/TetBackground.tsx` | Đổi import video |

