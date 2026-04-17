# 🚀 Hướng Dẫn Triển Khai FUNMoneyMinter v2 (FUN Monetary Expansion v1)

> Tài liệu hướng dẫn deploy hợp đồng `FUNMoneyMinter-2.sol` lên BSC Testnet/Mainnet và chuyển hệ thống đúc tiền sang kiến trúc v2 với `authorizedMinter` trực tiếp (thay thế PPLP Lock-Activate-Claim của v1).

**Ngày tạo:** 2026-04-17  
**Phiên bản contract:** v2.0  
**Mạng triển khai:** BSC Testnet (chainId 97) → Mainnet (chainId 56)

---

## 📋 Tóm Tắt Kiến Trúc v2

| Thành phần | v1 (đang chạy) | v2 (mới) |
|------------|----------------|----------|
| **Cơ chế đúc** | `lockWithPPLP()` → `activate()` → `claim()` | `mintReward()` trực tiếp |
| **Vai trò** | 3-of-3 Multisig Attesters (WILL/WISDOM/LOVE) | `authorizedMinter` (1 ví duy nhất) |
| **Phân bổ** | 100% vào ví user (lock 30 ngày) | 99% user / 1% treasury |
| **Vesting** | Lock-Activate-Claim on-chain | Off-chain (DB `reward_vesting_schedules`) |
| **Hỗ trợ** | EIP-712 signatures | Direct call (gas thấp hơn) |

---

## 🔐 Pre-requisites (Yêu Cầu Trước Khi Deploy)

### 1. Quyền Owner FUN Token

> ⚠️ **Đây là blocker chính hiện nay.** 
> Đội phát triển hiện **không có quyền owner** của contract FUN Money đang lưu hành (`0xCe96CD3D69D1B5c75A2bA0CF4068cC10567b6eDe`).

**Các quyền cần có trên FUN Token:**
- Gọi `grantRole(MINTER_ROLE, FUN_MINTER_V2_ADDRESS)` để cho phép contract mới đúc tiền
- HOẶC nếu contract dùng `Ownable`: gọi `setMinter(FUN_MINTER_V2_ADDRESS)`

**Phương án giải quyết:**
- **(a)** Liên hệ owner cũ (Genesis Wallet) ký giao dịch `grantRole`
- **(b)** Deploy lại FUN Token mới với owner là multisig 3-of-3 hiện tại
- **(c)** Tạo wrapper contract: `FUNv2Wrapper` mint token nội bộ (không cần MINTER_ROLE), user swap 1:1 với FUN cũ

### 2. Wallets Cần Chuẩn Bị

| Vai trò | Địa chỉ | Số dư cần |
|---------|---------|-----------|
| **Deployer** | (Tạo mới hoặc dùng Attester WILL) | ≥ 0.05 BNB |
| **Authorized Minter** | Khuyến nghị: Genesis Wallet `0xa4967da72d012151950627483285c01eb8a08e29` | ≥ 0.5 BNB (cho 100+ tx/tháng) |
| **Treasury Recipient** | `funtreasury` wallet `0xa4967da72d012151950627483285c01eb8a08e29` | (chỉ nhận 1%) |

### 3. Faucet tBNB (Testnet)

```
https://testnet.bnbchain.org/faucet-smart
```
Cần ~0.1 tBNB cho deployer + 0.5 tBNB cho minter.

---

## 🛠 Các Bước Deploy

### Bước 1: Compile Contract

```bash
# Cài đặt Hardhat (nếu chưa có)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts

# Tạo project hardhat
npx hardhat init

# Copy file
cp src/config/FUNMoneyMinter-2.sol contracts/FUNMoneyMinter.sol

# Compile
npx hardhat compile
```

### Bước 2: Deployment Script

Tạo `scripts/deploy-v2.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const FUN_TOKEN = "0xCe96CD3D69D1B5c75A2bA0CF4068cC10567b6eDe"; // FUN Money current
  const AUTHORIZED_MINTER = "0xa4967da72d012151950627483285c01eb8a08e29"; // Genesis
  const TREASURY = "0xa4967da72d012151950627483285c01eb8a08e29"; // funtreasury

  const Minter = await ethers.getContractFactory("FUNMoneyMinter");
  const minter = await Minter.deploy(FUN_TOKEN, AUTHORIZED_MINTER, TREASURY);
  await minter.waitForDeployment();

  const addr = await minter.getAddress();
  console.log("✅ FUNMoneyMinter v2 deployed at:", addr);
  console.log("📋 Verify với:");
  console.log(`npx hardhat verify --network bscTestnet ${addr} ${FUN_TOKEN} ${AUTHORIZED_MINTER} ${TREASURY}`);
}

main().catch(console.error);
```

### Bước 3: Hardhat Config

`hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
  },
};

export default config;
```

### Bước 4: Deploy & Verify

```bash
# Testnet
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy-v2.ts --network bscTestnet

# Verify
npx hardhat verify --network bscTestnet <DEPLOYED_ADDRESS> \
  0xCe96CD3D69D1B5c75A2bA0CF4068cC10567b6eDe \
  0xa4967da72d012151950627483285c01eb8a08e29 \
  0xa4967da72d012151950627483285c01eb8a08e29
```

### Bước 5: Grant MINTER_ROLE trên FUN Token

> **🔴 BƯỚC BLOCKER** - cần owner FUN Token thực hiện

```javascript
// Owner FUN Token gọi:
await funToken.grantRole(MINTER_ROLE, "<FUNMoneyMinter v2 address>");

// Hoặc nếu dùng Ownable:
await funToken.setAuthorizedMinter("<FUNMoneyMinter v2 address>");
```

### Bước 6: Cấu Hình Lovable Cloud

Thêm secrets vào Lovable Cloud:

```
FUN_MINTER_V2_ADDRESS = 0x... (địa chỉ contract vừa deploy)
FUN_MINTER_V2_PRIVATE_KEY = 0x... (private key của AUTHORIZED_MINTER wallet)
```

Cập nhật `src/config/pplp.ts`:

```typescript
export const PPLP_CONFIG = {
  // ...
  v2: {
    minterAddress: "0x...", // địa chỉ mới
    funToken: "0xCe96CD3D69D1B5c75A2bA0CF4068cC10567b6eDe",
    treasury: "0xa4967da72d012151950627483285c01eb8a08e29",
    chainId: 97, // testnet, đổi 56 cho mainnet
  },
};
```

### Bước 7: Smoke Test

```bash
# Gọi edge function pplp-v2-onchain-mint với test payload
curl -X POST "https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/pplp-v2-onchain-mint" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"recipient":"0x...","amount":1000,"actionId":"test-001"}'
```

Kiểm tra:
- ✅ Transaction thành công trên BSCScan
- ✅ User wallet nhận 990 FUN (99%)
- ✅ Treasury nhận 10 FUN (1%)
- ✅ Event `RewardMinted` được emit

---

## 🔄 Migration Strategy (Từ v1 → v2)

### Phase 1: Parallel Run (1-2 tuần)
- v1 vẫn chạy cho user cũ đang lock/activate
- v2 chạy cho mint requests mới
- Theo dõi metrics song song

### Phase 2: Sunset v1 (sau khi all active locks claimed)
- Vô hiệu hóa `pplp-mint-fun` (v1)
- Chuyển 100% sang `pplp-v2-onchain-mint`
- Cập nhật UI ẩn nút Activate/Claim cũ

### Phase 3: Vesting Off-Chain
- Cron `pplp-vesting-release-daily` đã chạy ổn định
- Mỗi ngày unlock 1/28 phần locked vào DB
- User claim từ DB qua edge function `claim-vested-rewards`

---

## ⚠️ Rủi Ro & Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| Mất private key `AUTHORIZED_MINTER` | Multisig wrapper hoặc HSM |
| Contract bug không thể nâng cấp | Deploy với UUPS proxy pattern |
| Treasury 1% bị spam dust | Set `minRewardAmount = 100` trong contract |
| FUN Token owner không grant role | Dùng wrapper contract (phương án c) |

---

## 📊 So Sánh Gas Cost (BSC Testnet)

| Operation | v1 Lock+Activate+Claim | v2 mintReward |
|-----------|------------------------|----------------|
| Gas units | ~280,000 (3 tx) | ~85,000 (1 tx) |
| Cost @ 5 gwei | ~0.0014 BNB | ~0.00043 BNB |
| **Tiết kiệm** | — | **~70%** |

---

## ✅ Checklist Cuối Cùng

- [ ] Liên hệ owner FUN Token để xin grant MINTER_ROLE (HOẶC chọn phương án wrapper)
- [ ] Nạp 0.5 BNB vào ví AUTHORIZED_MINTER
- [ ] Deploy `FUNMoneyMinter-2.sol` lên BSC Testnet
- [ ] Verify contract trên BSCScan
- [ ] Gọi `grantRole(MINTER_ROLE, ...)` trên FUN Token
- [ ] Add secrets `FUN_MINTER_V2_ADDRESS` + `FUN_MINTER_V2_PRIVATE_KEY` vào Lovable Cloud
- [ ] Smoke test 1 mint request → verify user nhận 99%, treasury nhận 1%
- [ ] Tạo cron `pplp-v2-auto-submit` (5 phút/lần) để batch process
- [ ] Migrate dần từ v1 sang v2
- [ ] Sunset v1 sau khi tất cả locks đã claimed

---

## 📚 Tài Liệu Liên Quan

- Contract source: `src/config/FUNMoneyMinter-2.sol`
- Edge function v2: `supabase/functions/pplp-v2-onchain-mint/index.ts`
- Memory spec: `mem://smart-contracts/fun-money-minter-v2-specification`
- Monetary spec: `mem://governance/fun-monetary-expansion-spec-v1`

---

*Cập nhật: 2026-04-17 — FUN Money SDK v2.0*
