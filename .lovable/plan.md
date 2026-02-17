
# Hiển thị phí gas thực tế thay vì con số cố định

## Vấn đề hiện tại
Hệ thống đang dùng con số cố định `0.002 BNB` cho mỗi giao dịch để ước tính phí gas. Con số này cao hơn thực tế 4-5 lần, khiến người dùng hoang mang.

## Giải pháp
Sử dụng `publicClient` từ wagmi để lấy `gasPrice` thực tế từ mạng BSC tại thời điểm giao dịch, kết hợp với gas limit chuẩn (21,000 cho BNB native, 65,000 cho ERC-20 token) để tính phí chính xác.

## Chi tiết kỹ thuật

### File 1: `src/lib/tokens.ts`
- Giữ `BNB_GAS_BUFFER` nhưng giảm xuống `0.0005` làm giá trị dự phòng (fallback) khi không lấy được gasPrice từ mạng.

### File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`

**Thêm hook lấy gasPrice thực tế:**
- Import `usePublicClient` từ wagmi, thêm `useEffect` + `useState` để gọi `publicClient.getGasPrice()` mỗi 30 giây
- Tính `estimatedGasPerTx` = gasPrice x gasLimit (65,000 cho ERC-20, 21,000 cho BNB native), chuyển sang đơn vị BNB
- Fallback về `0.0005` nếu không lấy được gasPrice

**Cập nhật 3 vị trí dùng phí gas:**
1. **Dòng 205** (gas warning): Thay `0.002 * recipientsWithWallet.length` bằng `estimatedGasPerTx * recipientsWithWallet.length`
2. **Dòng 344** (tính "Tặng tối đa"): Thay `0.002 * recipientsWithWallet.length` bằng `estimatedGasPerTx * recipientsWithWallet.length`
3. **Dòng 931** (hiển thị cảnh báo): Thay `0.002 * recipientsWithWallet.length` bằng `(estimatedGasPerTx * recipientsWithWallet.length).toFixed(4)` -- hiển thị con số thực tế

**Code mẫu cho hook gasPrice:**
```typescript
const publicClient = usePublicClient();
const [estimatedGasPerTx, setEstimatedGasPerTx] = useState(0.0005);

useEffect(() => {
  const fetchGasPrice = async () => {
    if (!publicClient) return;
    try {
      const gasPrice = await publicClient.getGasPrice();
      const gasLimit = selectedToken.address ? 65000n : 21000n;
      const totalWei = gasPrice * gasLimit;
      const inBnb = Number(totalWei) / 1e18;
      // Thêm 20% buffer an toàn
      setEstimatedGasPerTx(inBnb * 1.2);
    } catch {
      setEstimatedGasPerTx(0.0005);
    }
  };
  fetchGasPrice();
  const interval = setInterval(fetchGasPrice, 30000);
  return () => clearInterval(interval);
}, [publicClient, selectedToken.address]);
```

### Kết quả mong đợi

| Trước | Sau |
|-------|-----|
| "Cần khoảng 0.0160 BNB phí gas cho 8 giao dịch" | "Cần khoảng 0.0032 BNB phí gas cho 8 giao dịch" (con số thực tế từ mạng) |
| Con số cố định, không phản ánh tình trạng mạng | Con số cập nhật mỗi 30 giây, phản ánh đúng gasPrice hiện tại |
