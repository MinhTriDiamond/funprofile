

## Sửa lỗi: Nút nhạc không hiển thị + nhạc không tự phát

### Nguyên nhân
1. **Nút nhạc desktop** nằm trong block `{!isMobileOrTablet && isLoggedIn && (...)}` — chỉ hiện khi **đã đăng nhập**. Nếu chưa login thì không thấy nút.
2. **Autoplay không chạy** vì `globalAudio.ts` chỉ được import qua `ValentineMusicButton` — nếu component không render thì module không load, autoplay không kích hoạt.

### Thay đổi

**1. `src/components/layout/FacebookNavbar.tsx`**
- Đưa `ValentineMusicButton` ra **ngoài** điều kiện `isLoggedIn` trên desktop
- Thêm nút nhạc vào khu vực hiển thị cho **tất cả user** (cả đăng nhập và chưa đăng nhập)
- Cụ thể: thêm `<ValentineMusicButton variant="desktop" />` trước block `{!isLoggedIn && (...)}` hoặc đặt nó ở vị trí riêng không phụ thuộc `isLoggedIn`

**2. `src/App.tsx`**
- Thêm `import '@/lib/globalAudio'` ở đầu file để đảm bảo module autoplay luôn được load bất kể component nào render hay không

### Kết quả
- Nút nhạc hiển thị cho **mọi user** (đăng nhập hay chưa)
- Nhạc **tự động phát** khi có tương tác đầu tiên
- Volume slider + nút Xem Video vẫn hoạt động trong popover

