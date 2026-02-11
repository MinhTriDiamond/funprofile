

# Sua Loi Upload Anh Dai Dien

## Van de
Khi nguoi dung upload anh dai dien, he thong tao presigned URL thanh cong (buoc 1) nhung loi xay ra o buoc 2 khi trinh duyet PUT truc tiep len R2. Nguyen nhan co the la CORS tren R2 bucket khong cho phep origin cua Lovable preview/published domain.

## Giai phap
Thay doi cach upload avatar: thay vi client PUT truc tiep len R2 (can CORS), se gui file qua edge function `upload-to-r2` (server-side upload, khong can CORS). Voi avatar da crop (thuong nho hon 1MB), cach nay hoan toan phu hop.

## Cac buoc thuc hien

### Buoc 1: Cap nhat AvatarEditor.tsx
- Thay doi `handleCropComplete` de su dung edge function `upload-to-r2` thay vi `uploadToR2` (presigned URL)
- Chuyen anh crop sang base64 va gui qua edge function
- Them console.error chi tiet de de debug neu co loi

### Buoc 2: Them ham helper uploadAvatarViaEdgeFunction
- Chuyen Blob sang base64
- Goi edge function `upload-to-r2` voi file data, key va contentType
- Nhan ve URL cua anh da upload

## Chi tiet ky thuat

### File thay doi
- `src/components/profile/AvatarEditor.tsx`: Thay doi logic upload tu presigned URL sang edge function

### Logic moi
```
1. User chon anh -> Crop -> Blob
2. Chuyen Blob sang base64
3. Goi edge function upload-to-r2 voi { file: base64, key: "avatars/{userId}/avatar-{timestamp}.jpg", contentType: "image/jpeg" }
4. Edge function upload len R2 server-side (khong can CORS)
5. Cap nhat profiles.avatar_url
```

### Uu diem
- Khong phu thuoc vao CORS cua R2 bucket
- Avatar sau crop thuong chi 50-200KB, phu hop voi base64 qua edge function
- Su dung lai edge function `upload-to-r2` da co san va dang hoat dong tot

