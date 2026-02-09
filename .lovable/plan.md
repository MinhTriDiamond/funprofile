
# Kế Hoạch: Thêm Tính Năng Vuốt Xuống Để Refresh (Pull-to-Refresh)

## Tổng Quan

Thêm tính năng Pull-to-Refresh cho các trang chính trên mobile và tablet, cho phép user vuốt từ trên xuống để làm mới dữ liệu - giống như trải nghiệm của các ứng dụng native.

## Cách Hoạt Động

```text
┌─────────────────────────────────────────┐
│          ┌──────────────┐               │
│          │   ↓ ↓ ↓      │  ← User kéo xuống
│          └──────────────┘               │
│    ┌─────────────────────────┐          │
│    │   🔄 Đang tải lại...    │  ← Spinner xuất hiện
│    └─────────────────────────┘          │
│                                         │
│    ┌─────────────────────────┐          │
│    │   📝 Post 1             │          │
│    │   📝 Post 2             │          │
│    │   📝 Post 3             │          │
│    └─────────────────────────┘          │
│                                         │
└─────────────────────────────────────────┘
```

## Phạm Vi Áp Dụng

| Trang | Pull-to-Refresh |
|-------|-----------------|
| Feed (`/`) | ✅ Refresh posts |
| Friends (`/friends`) | ✅ Refresh friend lists |
| Donations (`/donations`) | ✅ Refresh transactions |
| Notifications (`/notifications`) | ✅ Refresh notifications |
| Wallet (`/wallet`) | ✅ Refresh balances |
| Profile (`/profile`) | ✅ Refresh profile data |
| Chat (`/chat`) | ✅ Refresh messages |

## Giải Pháp Kỹ Thuật

### 1. Tạo Custom Hook `usePullToRefresh`

Hook này sẽ:
- Theo dõi touch events (touchstart, touchmove, touchend)
- Tính toán khoảng cách kéo
- Trigger callback khi kéo đủ xa
- Chỉ hoạt động khi scroll position = 0 (đầu trang)

### 2. Tạo Component `PullToRefreshContainer`

Component wrapper sẽ:
- Hiển thị loading indicator khi đang kéo
- Animation mượt mà khi thả tay
- Cho phép custom refresh function từ props
- Tự động ẩn sau khi refresh xong

### 3. Tích Hợp Vào Các Trang

Mỗi trang sẽ wrap nội dung trong `PullToRefreshContainer` và truyền function refresh tương ứng (ví dụ: `refetch` từ React Query).

## Chi Tiết Files

| File | Hành động |
|------|-----------|
| `src/hooks/usePullToRefresh.ts` | Tạo mới - Hook xử lý touch events |
| `src/components/common/PullToRefreshContainer.tsx` | Tạo mới - UI wrapper với loading indicator |
| `src/pages/Feed.tsx` | Sửa - Thêm pull-to-refresh |
| `src/pages/Friends.tsx` | Sửa - Thêm pull-to-refresh |
| `src/pages/Donations.tsx` | Sửa - Thêm pull-to-refresh |
| `src/pages/Notifications.tsx` | Sửa - Thêm pull-to-refresh |
| `src/pages/Wallet.tsx` | Sửa - Thêm pull-to-refresh |
| `src/pages/Profile.tsx` | Sửa - Thêm pull-to-refresh |
| `src/pages/Chat.tsx` | Sửa - Thêm pull-to-refresh |

## Thiết Kế UI

```text
Trạng thái 1: Chưa kéo
┌─────────────────────────────────────┐
│ Navbar                              │
├─────────────────────────────────────┤
│ [Content bình thường]               │
└─────────────────────────────────────┘

Trạng thái 2: Đang kéo (< threshold)
┌─────────────────────────────────────┐
│ Navbar                              │
├─────────────────────────────────────┤
│     ↓ Kéo để làm mới                │  ← 50% opacity, text nhỏ
├─────────────────────────────────────┤
│ [Content bị đẩy xuống]              │
└─────────────────────────────────────┘

Trạng thái 3: Kéo đủ xa (≥ threshold)
┌─────────────────────────────────────┐
│ Navbar                              │
├─────────────────────────────────────┤
│     ↑ Thả để làm mới                │  ← Full opacity, màu primary
├─────────────────────────────────────┤
│ [Content bị đẩy xuống]              │
└─────────────────────────────────────┘

Trạng thái 4: Đang refresh
┌─────────────────────────────────────┐
│ Navbar                              │
├─────────────────────────────────────┤
│     🔄 Đang tải lại...              │  ← Spinner animation
├─────────────────────────────────────┤
│ [Content bị đẩy xuống]              │
└─────────────────────────────────────┘
```

## Chi Tiết Kỹ Thuật

### Hook `usePullToRefresh`

```typescript
interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;      // Khoảng cách tối thiểu để trigger (default: 80px)
  maxPull?: number;        // Khoảng cách kéo tối đa (default: 150px)
  disabled?: boolean;      // Tắt tính năng
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
  bindEvents: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
}
```

### Component Props

```typescript
interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}
```

## Kết Quả Mong Đợi

- ✅ Vuốt từ đầu trang xuống sẽ hiển thị loading indicator
- ✅ Thả tay sau khi kéo đủ xa sẽ trigger refresh
- ✅ Animation mượt mà, feedback rõ ràng
- ✅ Chỉ hoạt động trên mobile/tablet (không ảnh hưởng desktop)
- ✅ Không conflict với scroll bình thường
- ✅ Tích hợp với React Query để invalidate cache
