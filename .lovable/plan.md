

## Fix: Nhạc không dừng khi bấm nút tắt

### Nguyên nhân lỗi
Khi trình duyệt chặn autoplay, code đăng ký một listener `click` trên toàn bộ `document` để chờ người dùng tương tác. Khi người dùng bấm nút dừng nhạc:

1. `toggle()` chạy -> tạm dừng nhạc, đặt `isPlaying = false`
2. Ngay sau đó, listener `resumeOnInteraction` cũng bắt được click này -> phát nhạc lại, đặt `isPlaying = true`

Kết quả: nhạc không bao giờ dừng được.

### Giải pháp
Lưu reference của listener vào một `ref`, và khi người dùng bấm toggle lần đầu (dù là play hay pause), xóa listener fallback đó đi. Điều này đảm bảo:

- Nếu user bấm play: nhạc phát bình thường, listener bị xóa
- Nếu user bấm pause: nhạc dừng, listener không can thiệp

### Chi tiết thay đổi

**File: `src/components/layout/ValentineMusicButton.tsx`**

1. Thêm `resumeListenerRef = useRef` để lưu reference của fallback listener
2. Trong autoplay fallback, lưu listener vào ref trước khi đăng ký
3. Trong hàm `toggle()`, gọi `removeEventListener` để xóa fallback listener trước khi xử lý play/pause
4. Thêm cleanup trong `useEffect` return để xóa listener khi component unmount

### Code thay doi chinh

```typescript
const resumeListenerRef = useRef<(() => void) | null>(null);

// In autoplay catch block:
const resumeOnInteraction = () => {
  resumeListenerRef.current = null; // clear ref
  // ... play logic
};
resumeListenerRef.current = resumeOnInteraction;
document.addEventListener('click', resumeOnInteraction, { once: true });

// In toggle():
const toggle = useCallback(() => {
  // Remove fallback listener first
  if (resumeListenerRef.current) {
    document.removeEventListener('click', resumeListenerRef.current);
    document.removeEventListener('touchstart', resumeListenerRef.current);
    resumeListenerRef.current = null;
  }
  // ... existing toggle logic
}, [...]);
```

