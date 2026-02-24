

# Chỉnh kích thước ảnh bạn bè trong trang cá nhân giống Facebook

## Vấn đề
Hiện tại mục "Bạn bè" trên trang cá nhân hiển thị ảnh hơi nhỏ, khoảng cách giữa các ảnh chưa cân đối so với giao diện Facebook chuẩn (như ảnh tham khảo con gửi).

## Giải pháp
Chỉnh lại grid bạn bè để ảnh to hơn, bo góc mềm hơn, và khoảng cách hợp lý giống Facebook.

## Chi tiết kỹ thuật

### File: `src/pages/Profile.tsx` (dong 838-859)

1. **Tang gap grid** tu `gap-2` len `gap-1.5` (Facebook dung gap rat nho giua cac anh)
2. **Avatar sizing**: Giu `w-full aspect-square` nhung doi `rounded-lg` thanh `rounded-xl` cho mem hon
3. **Border**: Giam `border-2` xuong `border` de anh trong lon hon
4. **Ten ban be**: Tang `text-xs` len `text-sm` va them `leading-tight` de doc ro hon, gioi han 1 dong voi `truncate`
5. **Padding card**: Giam padding de anh chiem nhieu dien tich hon - tu `p-4` thanh `p-3`

### Ket qua mong doi
- Anh ban be to hon, sat nhau giong Facebook
- Bo goc mem, ten hien thi ro rang
- Tong the trong giong muc ban be Facebook nhu anh tham khao

