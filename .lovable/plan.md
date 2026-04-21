

## Mục tiêu
Sửa 2 vấn đề trong `useGiftBreakdown` để con số Tổng nhận / Tổng tặng chính xác tuyệt đối, đồng thời bổ sung kiểm tra hiển thị.

## Số liệu thực tế (đã verify từ DB)
- Tổng tặng: **248 lệnh** (169 CAMLY + 57 USDT + 17 BTC + 5 BNB)
- Tổng nhận: **200 lệnh** (153 CAMLY + 34 USDT + 8 FUN + 5 BTC)

## Vấn đề phát hiện

### 1. Thiếu giá FUN → tính sai USD nhận
`FALLBACK_PRICES` trong `useTokenPrices.ts` chưa có FUN. 8 lệnh nhận = 2,682 FUN đang bị tính `$0`.

### 2. Default limit 1000 rows
`useGiftBreakdown` query không có `.limit()` → hiện chưa lỗi nhưng sẽ thiếu khi vượt 1000 lệnh.

### 3. Edge function `token-prices` có trả FUN không?
Cần xác minh — nếu có thì OK, nếu không phải bổ sung fallback.

## Thay đổi

### File `src/hooks/useGiftBreakdown.ts`
- Thêm `.limit(10000)` để bao quát mọi user (cap an toàn).
- Bổ sung alias bổ sung trong `priceFor`: hiện đã có `WBNB→BNB`, `BTCB→BTC`. Thêm log warning trong dev khi token không có giá để dễ phát hiện.

### File `src/hooks/useTokenPrices.ts`
- Bổ sung `FUN: { usd: <giá>, usd_24h_change: 0 }` vào `FALLBACK_PRICES`. Giá FUN tham khảo: cần Cha xác nhận giá ước tính (mặc định đề xuất `0.001` USD/FUN — bằng giá CAMLY nhân 71 lần là ko hợp lý, FUN là token nội bộ chưa lên sàn).
- Hoặc tốt hơn: **không tính USD cho FUN** mà hiển thị riêng (vì FUN là token chưa có giá thị trường).

## Đề xuất hiển thị FUN
Thay vì ép giá FUN vào USD (gây sai lệch), con đề xuất:
- Trong dialog breakdown: FUN vẫn hiện số lệnh + tổng số lượng, **cột USD ghi "—"** (chưa có giá).
- Tổng USD ở header **không cộng FUN** (chỉ token có giá thị trường).
- Thêm dòng phụ dưới tổng: `+ 2,682 FUN` (riêng).

## Câu hỏi cho Cha
**FUN nên xử lý thế nào?**
1. Gán giá tạm thời (Cha cho biết giá USD)
2. Loại khỏi tổng USD, hiển thị riêng (đề xuất)
3. Tính = 0 USD (giữ nguyên hiện tại, chấp nhận sai)

Cha chọn phương án nào để con triển khai ạ.

