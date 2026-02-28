

# Fix Smart Portrait Fit - Bug Analysis

## Nguyên nhân

Có **2 bug** khiến Smart Portrait Fit không hoạt động:

### Bug 1: `fitMode` state trong `FacebookVideoPlayer` không sync với prop `objectFit`

File `src/components/ui/FacebookVideoPlayer.tsx` dòng 92:
```typescript
const [fitMode, setFitMode] = useState<'contain' | 'cover'>(objectFitProp || 'contain');
```

`useState` chỉ dùng giá trị khởi tạo **một lần duy nhất**. Khi `FeedVideoPlayer` detect portrait và thay đổi `resolvedObjectFit` từ `'cover'` sang `'contain'`, prop `objectFitProp` thay đổi nhưng `fitMode` state **không cập nhật theo**.

**Fix**: Thêm `useEffect` để sync `fitMode` khi `objectFitProp` thay đổi.

### Bug 2: Metadata detection timing trong `FeedVideoPlayer`

File `src/components/feed/FeedVideoPlayer.tsx` dòng 67-76: Query `document.querySelector` tìm `video` element có thể chạy **trước khi** `FacebookVideoPlayer` render xong video element, dẫn đến không detect được orientation.

**Fix**: Thêm retry mechanism hoặc dùng `MutationObserver` để đợi video element xuất hiện.

## Các file thay đổi

### 1. `src/components/ui/FacebookVideoPlayer.tsx`
- Thêm `useEffect` sync `objectFitProp` → `fitMode`: khi prop thay đổi, cập nhật state tương ứng

### 2. `src/components/feed/FeedVideoPlayer.tsx`  
- Cải thiện metadata detection: thêm retry với `setTimeout` hoặc `MutationObserver` để đợi video element mount trước khi query `loadedmetadata`

