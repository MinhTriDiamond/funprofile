
## Thêm nút nhạc Valentine cho người dùng chưa đăng nhập trên Desktop

### Vấn đề
Trên desktop, nút nhạc Valentine chỉ hiển thị khi người dùng **đã đăng nhập** (nằm trong block `!isMobileOrTablet && isLoggedIn`). Khi chưa đăng nhập, chỉ có nút "Đăng nhập" — không có nút nhạc.

### Giải pháp
Thêm `ValentineMusicButton` ngay bên cạnh nút "Đăng nhập" trong `FacebookNavbar.tsx`, để người dùng chưa đăng nhập cũng thấy và bật nhạc được.

### Chi tiết kỹ thuật

**File:** `src/components/layout/FacebookNavbar.tsx`

Thay đổi block hiển thị nút đăng nhập (dòng 392-400) để thêm nút nhạc bên cạnh:

```tsx
{/* Sign In Button - Only show when not logged in */}
{!isLoggedIn && (
  <>
    {!isMobileOrTablet && <ValentineMusicButton variant="desktop" />}
    <Button
      onClick={() => navigate('/auth')}
      className="bg-primary text-primary-foreground hover:bg-primary-hover"
    >
      {t('signIn')}
    </Button>
  </>
)}
```

Nút nhạc sẽ xuất hiện ngay bên trái nút "Đăng nhập" trên desktop, đảm bảo nhạc Valentine có thể bật được cho tất cả người dùng.
