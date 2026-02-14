
## Cập nhật giá CAMLY thực từ CoinGecko (CoinMarketCap)

### Tình trạng hiện tại
Hệ thống **đã** lấy giá CAMLY thực từ CoinGecko (ID: `camly-coin`), giá hiện tại khoảng **$0.00001405**. Tuy nhiên có 2 vấn đề:

1. **Giá dự phòng (fallback) cũ**: Khi CoinGecko chưa phản hồi hoặc lỗi, hệ thống dùng giá cũ `$0.000004` -- thấp hơn giá thực ~3.5 lần
2. **Khi chưa kết nối ví**: Giá CAMLY trên trang claim thưởng hiển thị `$0` vì nó lấy từ `externalTokens` (chỉ có khi ví đã kết nối)

### Thay đổi

#### 1. File: `src/hooks/useTokenBalances.ts`
- Cập nhật fallback price CAMLY từ `0.000004` thành `0.000014` (gần giá thực hơn)
- Đảm bảo `prices` luôn được fetch bất kể ví có kết nối hay không (hiện tại khi không kết nối ví, nó chỉ dùng fallback mà không gọi API)

#### 2. File: `src/components/wallet/WalletCenterContainer.tsx`
- Thay đổi logic lấy `camlyPrice`: thay vì chỉ lấy từ `externalTokens` (cần kết nối ví), sẽ tạo một hook/state riêng để fetch giá CAMLY từ CoinGecko, đảm bảo giá luôn có dù chưa kết nối ví
- Giá này sẽ được truyền xuống `ClaimRewardsSection` và `ClaimRewardDialog`

#### 3. Tạo hook mới: `src/hooks/useCamlyPrice.ts`
- Hook nhỏ gọn chuyên fetch giá CAMLY từ CoinGecko
- Hoạt động độc lập, không phụ thuộc vào trạng thái kết nối ví
- Cache giá và refresh mỗi 30 giây
- Dùng chung cho mọi nơi cần hiển thị giá CAMLY (wallet, gift, claim)

### Chi tiết kỹ thuật

**Hook mới `useCamlyPrice.ts`:**
```typescript
// Fetch giá CAMLY từ CoinGecko, không phụ thuộc vào ví
// Trả về: { price, change24h, isLoading }
// Fallback: $0.000014 nếu API lỗi
```

**WalletCenterContainer.tsx:**
```typescript
// Thay:
const camlyPrice = useMemo(() => {
  const camlyToken = externalTokens.find(t => t.symbol === 'CAMLY');
  return camlyToken?.price || 0;
}, [externalTokens]);

// Bằng:
const { price: camlyPrice } = useCamlyPrice();
```

**useTokenBalances.ts:**
- Cập nhật fallback CAMLY: `0.000004` -> `0.000014`
- Sửa logic để luôn fetch giá từ CoinGecko ngay cả khi chưa kết nối ví (hiện tại bị skip khi `!isConnected`)

### Kết quả
- Giá CAMLY thực luôn hiển thị ở mọi nơi: ví, tặng quà, claim thưởng
- Không cần kết nối ví vẫn thấy giá CAMLY chính xác
- Fallback gần sát giá thực khi CoinGecko tạm lỗi
