
# Kế Hoạch: Cập Nhật Liên Kết BscScan Với Logic Động

## Tổng Quan

Tạo hàm helper `getBscScanUrl` thông minh có thể quyết định sử dụng Mainnet hay Testnet dựa trên loại token, sau đó cập nhật tất cả các component sử dụng liên kết BscScan sai.

## Quy Tắc Logic

```text
┌─────────────────────────────────────────────────────────────┐
│                    getBscScanUrl(hash, type, tokenSymbol)    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   tokenSymbol === 'FUN'   ──────────►  Testnet               │
│   (FUN Money)                          testnet.bscscan.com   │
│                                                              │
│   tokenSymbol !== 'FUN'   ──────────►  Mainnet               │
│   (BNB, CAMLY, USDT...)                bscscan.com           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Các Vị Trí Cần Sửa

### Vấn Đề 1: Donation Cards sử dụng sai URL

Các component `DonationSuccessCard`, `DonationReceivedCard`, `DonationMessage` đang import `getTxUrl` từ `pplp.ts` (Testnet), nhưng donation chủ yếu là CAMLY/BNB nên cần chuyển sang Mainnet.

### Vấn Đề 2: Không có logic động theo token

Hiện tại không có cơ chế phân biệt URL theo loại token.

## Giải Pháp Kỹ Thuật

### 1. Tạo Helper Mới Trong `src/lib/bscScanHelpers.ts`

```typescript
const MAINNET_URL = 'https://bscscan.com';
const TESTNET_URL = 'https://testnet.bscscan.com';

// Token FUN luôn dùng Testnet (Chain ID 97)
// Các token khác (BNB, CAMLY, USDT) dùng Mainnet (Chain ID 56)
export const getBscScanTxUrl = (txHash: string, tokenSymbol?: string) => {
  const baseUrl = tokenSymbol?.toUpperCase() === 'FUN' ? TESTNET_URL : MAINNET_URL;
  return `${baseUrl}/tx/${txHash}`;
};

export const getBscScanAddressUrl = (address: string, tokenSymbol?: string) => {
  const baseUrl = tokenSymbol?.toUpperCase() === 'FUN' ? TESTNET_URL : MAINNET_URL;
  return `${baseUrl}/address/${address}`;
};
```

### 2. Giữ Nguyên `src/config/pplp.ts`

File này chuyên dành cho FUN Money (Testnet), giữ nguyên để các component PPLP tiếp tục hoạt động đúng.

### 3. Cập Nhật Các Donation Components

| Component | Thay đổi |
|-----------|----------|
| `DonationSuccessCard.tsx` | Thay `getTxUrl(data.txHash)` → `getBscScanTxUrl(data.txHash, data.tokenSymbol)` |
| `DonationReceivedCard.tsx` | Thay `getTxUrl(data.txHash)` → `getBscScanTxUrl(data.txHash, data.tokenSymbol)` |
| `DonationMessage.tsx` | Thay `getTxUrl(metadata.tx_hash)` → `getBscScanTxUrl(metadata.tx_hash, metadata.token_symbol)` |
| `DonationHistoryItem.tsx` | Đã đúng (Mainnet), chuyển sang dùng helper để nhất quán |

## Chi Tiết Files Cần Sửa

| File | Hành động |
|------|-----------|
| `src/lib/bscScanHelpers.ts` | **Tạo mới** - Helper functions với logic động |
| `src/components/donations/DonationSuccessCard.tsx` | **Sửa** - Import và sử dụng helper mới |
| `src/components/donations/DonationReceivedCard.tsx` | **Sửa** - Import và sử dụng helper mới |
| `src/components/donations/DonationMessage.tsx` | **Sửa** - Import và sử dụng helper mới |
| `src/components/wallet/DonationHistoryItem.tsx` | **Sửa** - Thay hardcode bằng helper |

## Files Giữ Nguyên (Đã Đúng)

| File | Lý do |
|------|-------|
| `src/config/pplp.ts` | Chuyên cho FUN Money (Testnet) - đúng |
| `src/components/admin/PplpMintTab.tsx` | Dùng getTxUrl từ pplp.ts cho FUN - đúng |
| `src/components/wallet/WalletManagement.tsx` | Đã dùng Mainnet - đúng |
| `src/components/admin/TreasuryBalanceCard.tsx` | Đã dùng Mainnet - đúng |
| `src/components/admin/BlockchainTab.tsx` | Đã dùng Mainnet - đúng |
| `supabase/functions/claim-reward/index.ts` | Đã dùng Mainnet (CAMLY) - đúng |

## Ví Dụ Logic Hoạt Động

```text
Giao dịch tặng 1000 CAMLY:
  → getBscScanTxUrl('0xabc...', 'CAMLY')
  → https://bscscan.com/tx/0xabc...  ✅ Mainnet

Giao dịch tặng 0.01 BNB:
  → getBscScanTxUrl('0xdef...', 'BNB')
  → https://bscscan.com/tx/0xdef...  ✅ Mainnet

Giao dịch mint 500 FUN:
  → getTxUrl('0x123...')  (từ pplp.ts)
  → https://testnet.bscscan.com/tx/0x123...  ✅ Testnet
```

## Kết Quả Mong Đợi

- Tất cả link BNB/CAMLY sẽ chỉ đến BSC Mainnet (bscscan.com)
- Tất cả link FUN Money vẫn chỉ đến BSC Testnet (testnet.bscscan.com)
- Code dễ bảo trì với helper tập trung
- Không ảnh hưởng đến các component PPLP/FUN đang hoạt động đúng
