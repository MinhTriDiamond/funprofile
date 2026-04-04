

# Cải thiện hiển thị số dư BTC thực tế trong ví

## Phân tích

Hiện tại hook `useBtcBalance` gọi Mempool.space API **1 lần duy nhất** khi mount, không có retry và lỗi bị nuốt im lặng. Nếu API bị rate-limit hoặc lỗi mạng → số dư hiển thị 0 mà không có cảnh báo.

Ngoài ra, hook không tự động refresh khi tab quay lại hoặc khi user pull-to-refresh.

## Thay đổi

### 1. File: `src/hooks/useBtcBalance.ts`
- Thêm **retry 2 lần** khi API lỗi (delay 2s giữa mỗi lần)
- Thêm **auto-refresh mỗi 60s** (dừng khi tab ẩn, resume khi tab hiện)
- Lưu trạng thái `error` để UI có thể hiển thị cảnh báo
- Fallback: nếu API chính lỗi, thử `blockstream.info/api` làm API phụ

### 2. File: `src/components/wallet/tabs/AssetTab.tsx`
- Hiển thị icon cảnh báo nhỏ khi có lỗi fetch balance (ví dụ: "Không thể tải số dư, nhấn để thử lại")
- Thêm nút reload nhỏ bên cạnh số dư BTC

### Chi tiết kỹ thuật

**useBtcBalance.ts** — cải thiện fetch:
```typescript
// Retry logic + fallback API
const fetchWithRetry = async (addr: string, retries = 2): Promise<number> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://mempool.space/api/address/${addr}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const funded = data.chain_stats?.funded_txo_sum ?? 0;
      const spent = data.chain_stats?.spent_txo_sum ?? 0;
      const mempoolFunded = data.mempool_stats?.funded_txo_sum ?? 0;
      const mempoolSpent = data.mempool_stats?.spent_txo_sum ?? 0;
      return ((funded - spent) + (mempoolFunded - mempoolSpent)) / 1e8;
    } catch {
      if (i === retries) {
        // Fallback to blockstream
        const res2 = await fetch(`https://blockstream.info/api/address/${addr}`);
        if (res2.ok) { /* parse tương tự */ }
        throw new Error('All APIs failed');
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return 0;
};
```

**AssetTab.tsx** — thêm nút retry:
```tsx
{error && (
  <button onClick={refetchBtc} className="text-xs text-orange-500">
    ⚠️ Thử lại
  </button>
)}
```

