
Mục tiêu
- Sửa chỗ hiển thị khiến BTC không được cộng vào “Tổng tài sản”.
- Làm rõ vì sao ví BTC có lịch sử nhận nhưng số dư hiện tại vẫn là 0.
- Giữ nguyên logic lấy số dư BTC on-chain vì phần này đang đúng.

Kết quả kiểm tra
- Địa chỉ `bc1q0wmq7evvgaj2e37ssmr5vxaq4hqdav7mkf7flf` hiện có số dư on-chain = `0 BTC`.
- Cả 2 nguồn `mempool.space` và `blockstream.info` đều trả cùng dữ liệu:
  - Tổng nhận: `510000 sat` = `0.00510000 BTC`
  - Tổng gửi: `510000 sat` = `0.00510000 BTC`
  - Mempool pending: `0`
- Nghĩa là địa chỉ này đã từng nhận BTC nhưng hiện đã chi hết, nên app đang hiển thị đúng số dư hiện tại. Vấn đề chính còn lại là phần tổng hợp và giải thích trên giao diện.

Nguyên nhân trong code
- `src/hooks/useBtcBalance.ts` đang tính đúng: `(funded - spent + mempool funded - mempool spent) / 1e8`.
- `src/components/wallet/tabs/AssetTab.tsx` có tính `btcUsdValue`, nhưng giá trị này chưa được cộng vào `totalUsdValue` của `WalletCard`.
- Khi chuyển sang network Bitcoin, `AssetTab.tsx` render riêng card BTC và bỏ luôn khối “Tổng tài sản”, nên người dùng không thấy tổng hợp đầy đủ.

Kế hoạch sửa
1. Thống nhất quy tắc “Tổng tài sản”
- “Tổng tài sản” sẽ luôn là tổng của:
  - tài sản EVM đang theo dõi
  - cộng thêm BTC on-chain của địa chỉ BTC đã liên kết
- Card BTC vẫn hiển thị riêng để đối chiếu chi tiết.

2. Cộng BTC vào tổng tài sản
- Trong `AssetTab.tsx`, tính:
  - `btcUsdValue`
  - `combinedTotalUsdValue = totalUsdValue + btcUsdValue`
- Ở EVM view, truyền `combinedTotalUsdValue` vào `WalletCard` thay cho `totalUsdValue`.

3. Hiển thị “Tổng tài sản” cả trong Bitcoin view
- Tách phần summary total trong `WalletCard.tsx` thành khối tái sử dụng, hoặc render lại một khối summary tương đương trong `AssetTab.tsx`.
- Khi người dùng chọn Bitcoin, phía trên vẫn có “Tổng tài sản”, không còn cảm giác BTC bị mất khỏi ví.

4. Thêm cảnh báo giải thích khi số dư BTC = 0 nhưng đã có lịch sử nhận
- Nếu:
  - `btcBalance === 0`
  - `btcTotalReceived > 0`
- Thì hiển thị note rõ ràng kiểu:
  - ví này đã từng nhận BTC
  - hiện toàn bộ UTXO đã được chi
  - số dư on-chain hiện tại bằng 0
- Giữ nguyên nút explorer và nút “Thử lại”.

5. Làm rõ phạm vi đồng bộ
- Thêm dòng mô tả ngắn rằng hệ thống hiện đang theo dõi đúng 1 địa chỉ BTC đã lưu.
- Điều này giúp tránh hiểu nhầm với ví điện thoại kiểu HD wallet, nơi ứng dụng ví có thể cộng dồn nhiều địa chỉ con khác nhau.

File cần sửa
- `src/components/wallet/tabs/AssetTab.tsx`
  - cộng BTC vào tổng tài sản
  - hiển thị summary total trong Bitcoin view
  - thêm banner giải thích trạng thái “đã nhận nhưng đã chi hết”
- `src/components/wallet/WalletCard.tsx`
  - tách hoặc tái sử dụng khối hiển thị “Tổng tài sản”

Chi tiết kỹ thuật
```text
Hiện tại:
- useBtcBalance = đúng
- WalletCard total = chỉ nhận totalUsdValue từ EVM
- BTC card = tách riêng
- Bitcoin view = không render total card

Sau khi sửa:
- Combined total = EVM total + BTC USD
- EVM view = tổng tài sản có cộng BTC
- Bitcoin view = vẫn có tổng tài sản + card BTC chi tiết
- BTC = 0 nhưng từng nhận tiền = có thông báo giải thích rõ
```

Kết quả mong đợi
- Không còn tình trạng BTC bị “lọt” khỏi phần tổng tài sản.
- Nếu địa chỉ thật sự đang 0 BTC, người dùng sẽ hiểu rõ là do đã chi hết chứ không phải hệ thống đọc sai.
- Giao diện đồng nhất hơn giữa chế độ EVM và Bitcoin.
