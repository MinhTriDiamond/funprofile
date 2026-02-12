

# Fix lỗi kẹt màn hình "Đang kiểm tra..."

## Nguyên nhân

Component `LawOfLightGuard` không có `try/catch` bao quanh các lời gọi async (`getSession`, query `profiles`). Khi kết nối database chậm hoặc lỗi mạng, `isChecking` giữ nguyên `true` mãi mãi, khiến UI hiển thị spinner vĩnh viễn.

Ngoài ra, một số nhánh code (redirect cases) gọi `navigate()` nhưng không set `isChecking = false`, gây treo nếu navigate không hoạt động như mong đợi.

## Giải pháp

### `src/components/auth/LawOfLightGuard.tsx`

1. Bọc toàn bộ logic trong `try/catch` -- nếu có lỗi, vẫn cho phép truy cập (fail-open) thay vì kẹt spinner
2. Thêm timeout 8 giây -- nếu kiểm tra quá lâu, tự động cho qua
3. Đảm bảo mọi nhánh code đều set `isChecking = false` (kể cả khi navigate)

Thay doi chinh:

```typescript
useEffect(() => {
  const checkLawOfLightAcceptance = async () => {
    try {
      // ... existing logic giữ nguyên ...
    } catch (error) {
      console.error('[LawOfLightGuard] Error:', error);
      // Fail-open: cho phép truy cập thay vì kẹt spinner
      setIsAllowed(true);
    } finally {
      setIsChecking(false); // Luôn tắt spinner
    }
  };

  // Timeout safety: 8 giây max
  const timeout = setTimeout(() => {
    setIsChecking(false);
    setIsAllowed(true);
  }, 8000);

  checkLawOfLightAcceptance();
  return () => clearTimeout(timeout);
}, [...]);
```

## Kết quả mong đợi
- Không bao giờ kẹt ở "Đang kiểm tra..." vĩnh viễn
- Nếu database chậm/lỗi, sau tối đa 8 giây sẽ tự cho qua
- Logic Law of Light vẫn hoạt động bình thường khi kết nối ổn định

