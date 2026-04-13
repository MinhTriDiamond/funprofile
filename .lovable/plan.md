

## Phân tích lỗi: Avatar orbit hiển thị sai avatar của user khác

### Nguyên nhân tìm thấy

Có **2 lỗi chính** trong `AvatarOrbit.tsx`:

**1. Stale closure trong `fetchMissing` effect (dòng 184-237)**
- Effect chỉ phụ thuộc `[userId]` nhưng sử dụng `localLinks` từ closure
- Khi component mount, `localLinks` có thể chứa dữ liệu cũ từ user trước (do React chưa cập nhật state kịp)
- `newLinks = [...localLinks]` (dòng 205) có thể clone links của user A, rồi ghi avatar mới vào và lưu DB cho user B
- **Hậu quả**: Avatar từ user A bị lưu vào `social_links` của user B trong database

**2. Thiếu AbortController cho async fetch**
- Khi chuyển nhanh giữa các profile, nhiều `fetchMissing` chạy song song
- Dù có check `userId === currentUserIdRef.current`, `newLinks` vẫn dựa trên `localLinks` cũ từ closure
- Avatar fetch xong → ghi vào DB sai profile

### Kế hoạch sửa

**File: `src/components/profile/AvatarOrbit.tsx`**

1. **Thêm `localLinksRef`** để `fetchMissing` luôn đọc dữ liệu mới nhất thay vì closure cũ:
   ```tsx
   const localLinksRef = useRef<SocialLink[]>(socialLinks);
   // Cập nhật ref mỗi khi localLinks thay đổi
   useEffect(() => { localLinksRef.current = localLinks; }, [localLinks]);
   ```

2. **Sửa `fetchMissing` effect** để dùng ref thay vì closure:
   ```tsx
   useEffect(() => {
     if (!userId) return;
     let cancelled = false; // AbortController đơn giản
     
     const fetchMissing = async () => {
       const currentLinks = localLinksRef.current; // Đọc từ ref
       const linksToRefetch = currentLinks.filter(/* ... */);
       if (linksToRefetch.length === 0) return;
       
       const newLinks = [...currentLinks];
       for (const link of linksToRefetch) {
         if (cancelled) return; // Abort nếu userId đã đổi
         // ... fetch avatar ...
       }
       if (cancelled) return;
       if (userId === currentUserIdRef.current) {
         // Ghi DB + cập nhật state
       }
     };
     fetchMissing();
     return () => { cancelled = true; }; // Cleanup khi userId đổi
   }, [userId]);
   ```

3. **Thêm guard vào `onLinksChanged`** trong `ProfileHeader.tsx` để đảm bảo chỉ cập nhật state cho đúng profile đang xem

### Kết quả
- Avatar orbit chỉ hiển thị đúng avatar từ social links của user đang xem
- Không còn race condition khi chuyển nhanh giữa các profile
- Dữ liệu `social_links` trong DB không bị ghi đè sai

