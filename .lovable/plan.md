

## Insert lệnh swap thứ 2 cho angelaivan

### Dữ liệu từ BSCScan
- **TX hash**: `0x81dd5bb51745832e2f9924dbe1416103a28f8f99e1762b93599115ebc1b72419`
- **Swap**: 100 USDT → 5,340,191.109 CAMLY
- **Ngày**: 2026-02-17T03:43:52.000Z
- **Router**: MetaMask Swap Router (`0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31`)

### Thực hiện — Insert data (dùng insert tool)

**1. `swap_transactions`** — 1 record:
- user_id: `5f9de7c5-0c80-49aa-8e1c-92d8058558e4`
- tx_hash: `0x81dd5bb51745832e2f9924dbe1416103a28f8f99e1762b93599115ebc1b72419`
- from_symbol: USDT, from_amount: 100
- to_symbol: CAMLY, to_amount: 5340191.109
- chain_id: 56, status: confirmed
- created_at: 2026-02-17T03:43:52.000Z

**2. `wallet_transfers`** — 2 records:
- OUT: USDT 100, counterparty `0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31`
- IN: CAMLY 5,340,191.109, counterparty `0xc590175e458b83680867afd273527ff58f74c02b`

### Không có thay đổi code — chỉ insert dữ liệu

