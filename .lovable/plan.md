
Mục tiêu: làm cho swap CAMLY ↔ USDT chạy ổn định trên BNB Smart Chain, ưu tiên route đúng pool, tránh gửi giao dịch chắc chắn sẽ fail, và giữ UX mượt.

1. Chẩn đoán hiện tại
- Code đang luôn route token-token qua WBNB nếu cả 2 token không phải BNB.
- Với CAMLY ↔ USDT, ngoài web cho thấy có pool trực tiếp CAMLY/USDT, nên route hiện tại có thể không tối ưu.
- Giao dịch fail trước khi hoàn tất rất giống trường hợp router simulation/revert trong ví.
- Rủi ro lớn nhất là CAMLY có cơ chế fee-on-transfer / output thực nhận thấp hơn quote, trong khi code đang dùng `swapExactTokensForTokens` thường, dễ revert.
- Hiện quote lưu ở dạng string format rồi parse lại khi swap; với token 3 decimals như CAMLY nên giữ raw bigint để tránh lệch số.

2. Những gì sẽ sửa
- `src/config/swap.ts`
  - Bổ sung ABI cho:
    - `factory()`
    - `getPair(address,address)`
    - `swapExactTokensForTokensSupportingFeeOnTransferTokens`
    - `swapExactTokensForETHSupportingFeeOnTransferTokens`
- `src/modules/wallet/services/swapAsset.ts`
  - Thêm bước tìm route:
    - thử direct path `[CAMLY, USDT]` nếu pair tồn tại và `getAmountsOut` hợp lệ
    - nếu direct không hợp lệ thì fallback `[CAMLY, WBNB, USDT]`
    - có thể thử cả hai path và chọn path nào quote thành công / tốt hơn
  - Thêm validation trước khi mở ví:
    - `getAmountsOut(amountIn, path)`
    - nếu lỗi hoặc output = 0 thì chặn swap, báo lỗi rõ ràng
  - Giữ quote ở cả dạng:
    - `amountInWei`
    - `amountOutWei`
    - `amountOutMinWei`
    - `path`
    - `routerMethod`
  - Chọn method thực thi chính xác:
    - BNB → token: `swapExactETHForTokens`
    - token → BNB: ưu tiên `swapExactTokensForETHSupportingFeeOnTransferTokens`
    - token → token: ưu tiên `swapExactTokensForTokensSupportingFeeOnTransferTokens` cho CAMLY
  - Giữ approval check như hiện tại nhưng thêm log allowance và trạng thái route
  - Cải thiện `mapSwapError` để bắt các lỗi liquidity/slippage/simulation dễ hiểu hơn
- `src/components/wallet/SwapTab.tsx`
  - Dùng metadata route thật từ quote để hiển thị:
    - `CAMLY → USDT`
    - hoặc `CAMLY → WBNB → USDT`
  - Khi quote fail, báo nguyên nhân rõ hơn thay vì chung chung
  - Giữ nút `Approve CAMLY` trước swap nếu thiếu allowance
  - Giữ thông báo swap thành công, bổ sung mô tả route nếu cần

3. Vì sao cách này sẽ xử lý lỗi CAMLY ↔ USDT
- Không còn ép route qua WBNB khi pool trực tiếp có sẵn.
- Nếu CAMLY là fee-on-transfer, dùng “SupportingFeeOnTransferTokens” sẽ tránh revert do output thực nhận thấp hơn tính toán ban đầu.
- Preflight validation chặn các giao dịch chắc chắn lỗi trước khi MetaMask mở xác nhận.
- Lưu giá trị raw bigint giúp tránh sai số với CAMLY 3 decimals.

4. Kết quả mong đợi
- Swap được cả:
  - CAMLY → USDT
  - USDT → CAMLY
- Chọn route hợp lệ tự động.
- Nếu pool/path không hợp lệ, người dùng thấy lỗi rõ ràng thay vì giao dịch bị hủy mơ hồ.
- Approval, quote, execute, success toast hoạt động liền mạch hơn.

5. Ghi chú kỹ thuật
- Dấu hiệu từ dữ liệu tham chiếu cho thấy pool CAMLY/USDT tồn tại, nên direct pair cần được hỗ trợ.
- Phần “transaction cancelled” trong ví nhiều khả năng là simulation fail trước khi broadcast, không hẳn người dùng tự bấm hủy.
- Đây là task sửa frontend/on-chain integration, không cần thay đổi backend hay database.
