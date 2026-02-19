
## Thêm nút "Xem Tất Cả" vào tab Lịch Sử trong trang Wallet

### Mô tả
Thêm một nút "Xem Tất Cả" vào cuối danh sách giao dịch trong tab Lịch Sử (`/wallet/history`). Khi người dùng bấm, sẽ điều hướng đến trang `/donations` để xem toàn bộ lịch sử giao dịch của FUN Profile.

### Thay đổi

**File: `src/components/wallet/tabs/HistoryTab.tsx`**

Thêm nút "Xem Tất Cả" phía dưới component `DonationHistoryTab`:
- Sử dụng `useNavigate` từ `react-router-dom` để điều hướng đến `/donations`
- Nút có icon mũi tên và text rõ ràng
- Thiết kế nổi bật nhưng hài hòa với giao diện hiện tại (variant `outline`, full width, có icon `ExternalLink` hoặc `ArrowRight`)

### Chi tiết kỹ thuật

```tsx
// HistoryTab.tsx
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DonationHistoryTab } from '../DonationHistoryTab';

export function HistoryTab() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <DonationHistoryTab />
      <div className="flex justify-center pt-2 pb-4">
        <Button
          variant="outline"
          className="w-full max-w-md gap-2"
          onClick={() => navigate('/donations')}
        >
          Xem Tất Cả Giao Dịch FUN Profile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### Tóm tắt
- Chỉ sửa 1 file duy nhất: `src/components/wallet/tabs/HistoryTab.tsx`
- Thêm nút navigate đến `/donations`
- Không ảnh hưởng logic hay giao diện hiện tại
