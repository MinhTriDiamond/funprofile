

# Xuất tài liệu tính năng BTC Native (Markdown)

## Mô tả

Tạo file Markdown tổng hợp toàn bộ tính năng gửi/nhận BTC native trên Fun.Rich, bao gồm:

## Nội dung tài liệu

1. **Tổng quan kiến trúc** — Sơ đồ luồng gửi/nhận BTC qua BIP21, polling Mempool.space, scanner backend
2. **Danh sách file liên quan** — Liệt kê tất cả ~15 file frontend (hooks, components, utils) và 1 edge function backend
3. **Luồng gửi BTC** — BIP21 deep link → mở ví ngoài → polling xác nhận → ghi DB
4. **Luồng nhận BTC** — Scanner quét Mempool.space → tạo donation + wallet_transfer + post + notification
5. **Số dư BTC** — useBtcBalance với retry + fallback Blockstream + auto-refresh 60s
6. **Lịch sử giao dịch** — useBtcTransactions parse vin/vout từ Mempool API
7. **Cấu trúc database** — Các bảng donations, wallet_transfers, posts với chain_id=0 cho BTC
8. **Ràng buộc kỹ thuật** — Không ký trực tiếp qua MetaMask, dùng ví ngoài, HD wallet limitation
9. **Hiển thị UI** — 8 chữ số thập phân, mạng "BTC" trên biên nhận, logo 24px

## Thực hiện

Chạy script tạo file `/mnt/documents/BTC-Native-Feature-Documentation.md` chứa toàn bộ nội dung trên, tổng hợp từ source code thực tế.

