

# Kế Hoạch: Kiểm Tra Treasury và Hiển Thị Số Dư Cho Admin

## Mục Tiêu

1. **Tạo Edge Function** để lấy số dư Treasury (BNB + CAMLY)
2. **Thêm component** hiển thị Treasury balance trong Admin Dashboard
3. **Hướng dẫn test** flow claim CAMLY

## Phân Tích Hiện Trạng

### Đã có sẵn:
- ✅ `TREASURY_WALLET_ADDRESS` - Đã cấu hình
- ✅ `TREASURY_PRIVATE_KEY` - Đã cấu hình  
- ✅ Edge function `claim-reward` - Hoạt động đầy đủ
- ✅ CAMLY Token: `0x0910320181889feFDE0BB1Ca63962b0A8882e413` (3 decimals)

### Cần bổ sung:
- Edge function để lấy Treasury balance (an toàn, không cần private key)
- Component hiển thị cho Admin Dashboard

## Chi Tiết Thay Đổi

### 1. Tạo Edge Function: `treasury-balance`

```typescript
// supabase/functions/treasury-balance/index.ts
// Chức năng: Trả về số dư BNB và CAMLY trong Treasury Wallet
// Bảo mật: Chỉ Admin mới gọi được (kiểm tra role)
// Không cần private key - chỉ đọc public data từ blockchain

GET /treasury-balance
Response: {
  bnb_balance: "0.5",
  camly_balance: "10000000",
  treasury_address: "0x...",
  updated_at: "2026-01-29T..."
}
```

### 2. Tạo Component: `TreasuryBalanceCard`

```typescript
// src/components/admin/TreasuryBalanceCard.tsx
// Hiển thị:
// - Số dư BNB (để trả gas)
// - Số dư CAMLY (để trả thưởng)
// - Địa chỉ Treasury (link BscScan)
// - Cảnh báo nếu số dư thấp
```

### 3. Thêm vào OverviewTab hoặc BlockchainTab

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💰 Treasury Wallet                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📍 Address: 0x1234...ABCD   [📋 Copy] [🔗 BscScan]                │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │      BNB            │  │      CAMLY          │                  │
│  │   0.523 BNB         │  │   5,000,000 CAMLY   │                  │
│  │   (~$365.10)        │  │   (~$20.00)         │                  │
│  │   ✅ Đủ gas fee     │  │   ✅ Đủ trả thưởng  │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
│                                                                     │
│  ⚠️ Cảnh báo: Nếu BNB < 0.01 hoặc CAMLY < 100,000                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `supabase/functions/treasury-balance/index.ts` | CREATE | Edge function lấy số dư |
| `src/components/admin/TreasuryBalanceCard.tsx` | CREATE | Component hiển thị |
| `src/components/admin/BlockchainTab.tsx` | UPDATE | Thêm TreasuryBalanceCard |

## Chi Tiết Code

### Edge Function: `treasury-balance`

```typescript
// supabase/functions/treasury-balance/index.ts

import { createClient } from 'supabase-js';
import { createPublicClient, http, formatUnits } from 'viem';
import { bsc } from 'viem/chains';

const CAMLY_CONTRACT = '0x0910320181889feFDE0BB1Ca63962b0A8882e413';

Deno.serve(async (req) => {
  // 1. CORS handling
  // 2. Verify admin role
  // 3. Get TREASURY_WALLET_ADDRESS from env
  // 4. Use publicClient to read:
  //    - BNB balance: getBalance()
  //    - CAMLY balance: readContract({ balanceOf })
  // 5. Return formatted balances
});
```

### Component: `TreasuryBalanceCard`

```typescript
// src/components/admin/TreasuryBalanceCard.tsx

export const TreasuryBalanceCard = () => {
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTreasuryBalance();
  }, []);

  const fetchTreasuryBalance = async () => {
    const { data } = await supabase.functions.invoke('treasury-balance');
    setBalances(data);
  };

  return (
    <Card>
      {/* Treasury address + BNB balance + CAMLY balance */}
      {/* Warnings if low balance */}
    </Card>
  );
};
```

## Hướng Dẫn Test Flow Claim (Sau Khi Hoàn Thành)

### Bước 1: Kiểm tra Treasury
1. Truy cập `/admin` → Tab "⛓️ Blockchain"
2. Xem card "Treasury Wallet"
3. Đảm bảo có đủ BNB (> 0.01) và CAMLY (> số cần claim)

### Bước 2: Nạp tiền Treasury (nếu thiếu)
```text
Treasury Address: [Xem trong Admin Dashboard]

1. Mở ví cá nhân (MetaMask, Bitget...)
2. Gửi BNB (0.1 BNB là đủ ~100 transactions)
3. Gửi CAMLY (đủ để trả thưởng)
```

### Bước 3: Test Claim
1. Đăng nhập với user có `reward_status = 'approved'`
2. Vào `/wallet`
3. Kết nối External Wallet
4. Nhấn "Claim to Wallet"
5. Nhập số lượng và confirm
6. Xem transaction trên BscScan

## Cảnh Báo & Thresholds

| Token | Warning Level | Critical Level |
|-------|---------------|----------------|
| BNB   | < 0.05 BNB    | < 0.01 BNB     |
| CAMLY | < 500,000     | < 100,000      |

## Tóm Tắt

1. **Tạo Edge Function** `treasury-balance` để đọc số dư on-chain
2. **Tạo Component** `TreasuryBalanceCard` hiển thị cho Admin
3. **Tích hợp** vào BlockchainTab trong Admin Dashboard
4. Admin có thể theo dõi số dư Treasury realtime

