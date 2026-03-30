

## Cập nhật 2 giao dịch swap cho angelaivan

### Thông tin giao dịch từ BSCScan

**TX1** `0x2dc7d89b...`: Chuyển 150 USDT đến `0x348D4092...20391c5` — 22/02/2026 02:47:09 UTC
- BSCScan ghi nhận đây là lệnh **Transfer USDT**, không phải swap trực tiếp

**TX2** `0x4eb06ada...`: Swap 100 USDT → 5,238,346.218 CAMLY via PancakeSwap — 17/02/2026 03:44:50 UTC
- BSCScan ghi nhận đây là lệnh **Swap** qua MetaMask Router

### Kế hoạch

#### Migration SQL — Insert vào `swap_transactions` và `wallet_transfers`

**TX2 (Swap rõ ràng):**
- `swap_transactions`: from_symbol=USDT, from_amount=100, to_symbol=CAMLY, to_amount=5238346.218
- `wallet_transfers` x2:
  - direction=out, token=USDT, amount=100, counterparty=0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31 (MetaMask Router)
  - direction=in, token=CAMLY, amount=5238346.218, counterparty=0xc590175e458b83680867afd273527ff58f74c02b

**TX1 (Transfer USDT — ghi nhận theo yêu cầu user):**
- `wallet_transfers`: direction=out, token=USDT, amount=150, counterparty=0x348d4092c405e803167cf6adeced9b57c20391c5

### File thay đổi
1. **Migration SQL** — INSERT vào `swap_transactions` (1 record) và `wallet_transfers` (3 records)

