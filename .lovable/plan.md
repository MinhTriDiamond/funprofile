

# Fix orbit layout trên mobile + Copy link/ví

## Vấn đề
1. **Orbit links trên mobile** — Avatar container có `-mt-[120px]` kéo lên ảnh bìa, nhưng các icon orbit bị che bởi Honor Board mobile phía trên. Cần đảm bảo avatar + orbit hiển thị đúng như hình tham khảo (giống desktop).
2. **Copy link / ví không hoạt động trên mobile** — Nút copy quá nhỏ (`p-0.5`, icon 12px) khó nhấn trên mobile. Ngoài ra cần đảm bảo `copyToClipboard` xử lý lỗi đúng và hiển thị toast phản hồi.

## Thay đổi

### 1. `ProfileHeader.tsx` — Tăng vùng nhấn nút copy
- **Copy link hồ sơ (dòng 153-155)**: Tăng padding từ `p-0.5` → `p-1.5`, tăng icon từ `12×12` → `16×16`, thêm `touch-action: manipulation` để tránh delay trên mobile
- **Copy ví (dòng 163)**: Tăng padding từ `p-1` → `p-2`, tăng icon từ `w-3.5 h-3.5` → `w-4 h-4`
- Thêm xử lý lỗi `.catch()` cho cả hai nút copy để hiển thị toast lỗi khi copy thất bại

### 2. `ProfileHeader.tsx` — Đảm bảo orbit không bị che trên mobile
- Dòng 109: Tăng z-index cho avatar container trên mobile để orbit nổi trên Honor Board
- Đảm bảo `overflow: visible` lan truyền đúng

### 3. `AvatarOrbit.tsx` — Không thay đổi (layout orbit đã đúng)

## Kết quả
- Nút copy link và ví đủ lớn để nhấn trên mobile, có phản hồi lỗi
- Orbit icons hiển thị đúng vị trí, không bị che bởi các element khác

