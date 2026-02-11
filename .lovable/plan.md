
# Thong Ke Tinh Nang Vi (Wallet) - Hoan Thanh va Chua Hoan Thanh

## A. DA HOAN THANH (17 thanh phan)

### 1. Ket noi vi va quan ly phien
| Thanh phan | File | Mo ta |
|------------|------|-------|
| RainbowKit Connect | `src/config/web3.ts` | Ho tro MetaMask, Trust Wallet, Bitget, FUN Wallet |
| Multi-account selector | `ActiveAccountContext.tsx` | Chon nhieu tai khoan trong 1 vi |
| Account Mismatch Modal | `AccountMismatchModal.tsx` | Canh bao khi dia chi provider khac voi dia chi dang chon |
| Network Selector | `WalletCenterContainer.tsx` | Chuyen doi BNB Mainnet / BSC Testnet |
| Disconnect flow | `WalletCenterContainer.tsx` | Luu trang thai disconnect vao localStorage |

### 2. Hien thi tai san
| Thanh phan | File | Mo ta |
|------------|------|-------|
| Token Balances | `useTokenBalances.ts` | Doc so du BNB, USDT, BTCB, CAMLY tu on-chain |
| Price Fetching | `useTokenBalances.ts` | Gia tu CoinGecko, cap nhat moi 30s |
| WalletCard | `WalletCard.tsx` | Hien thi tong tai san, danh sach token, gia, % thay doi 24h |
| FUN Balance Card | `FunBalanceCard.tsx` | Hien thi LOCKED / ACTIVATED / TOTAL tu smart contract |

### 3. Giao dich
| Thanh phan | File | Mo ta |
|------------|------|-------|
| Send tokens | `useSendToken.ts` | Gui BNB/USDT/BTCB/CAMLY voi may trang thai 7 buoc |
| Receive (QR Code) | `ReceiveTab.tsx` | Ma QR + Copy/Share dia chi |
| Swap (External) | `WalletCenterContainer.tsx` | Mo PancakeSwap |
| Buy (External) | `WalletCenterContainer.tsx` | Mo MoonPay |
| Recent Transactions | `RecentTransactions.tsx` | Lich su giao dich voi auto-refresh trang thai |

### 4. Phan thuong CAMLY
| Thanh phan | File | Mo ta |
|------------|------|-------|
| Reward Breakdown | `RewardBreakdown.tsx` | Chi tiet thuong theo tung loai hoat dong |
| Reward Formula | `RewardFormulaCard.tsx` | Cong thuc tinh thuong minh bach |
| Claim CAMLY Dialog | `ClaimRewardDialog.tsx` | Chuyen CAMLY vao vi, co confetti animation |

### 5. PPLP / FUN Money
| Thanh phan | File | Mo ta |
|------------|------|-------|
| Light Score Dashboard | `LightScoreDashboard.tsx` | 5 Pillars, tier, progress bar |
| Light Actions List | `ClaimRewardsCard.tsx` | Danh sach actions cho claim, nhom theo loai |
| Claim FUN (mint request) | `useMintFun.ts` + `usePendingActions.ts` | Tao mint request gui Admin |
| Activate Dialog | `ActivateDialog.tsx` | Chuyen FUN tu LOCKED sang ACTIVATED tren smart contract |
| FUN Balance on-chain | `useFunBalance.ts` | Doc locked/activated tu contract alloc() |

### 6. Lich su tang thuong
| Thanh phan | File | Mo ta |
|------------|------|-------|
| Donation History Tab | `DonationHistoryTab.tsx` | Tab gui/nhan, thong ke, xuat CSV |
| Gift Celebration replay | `DonationHistoryTab.tsx` | Click xem lai the chuc mung voi hieu ung goc |

---

## B. CHUA HOAN THANH / CAN CAI THIEN (8 muc)

### B1. Claim FUN (ACTIVATED -> FLOWING) - CHUA CO
- **Van de**: User da co the Activate (LOCKED -> ACTIVATED) nhung KHONG CO component de goi `claim()` chuyen FUN tu ACTIVATED sang vi (FLOWING)
- **Can tao**: `ClaimFunDialog.tsx` va hook `useClaimFun.ts`
- **ABI**: Goi `contract.claim(amount)` tu vi user
- **Anh huong**: User khong the su dung FUN da activated

### B2. FUN Token khong hien thi trong token list - THIEU
- **Van de**: `useTokenBalances.ts` chi doc 4 token (BNB, USDT, BTCB, CAMLY) tren BSC Mainnet. FUN token (`0x1aa8...`) KHONG duoc doc so du vi no nam tren BSC Testnet
- **Can sua**: Them FUN vao danh sach token, doc balance theo chainId hien tai (Mainnet hoac Testnet)

### B3. Token balances chi doc tu Mainnet - HAN CHE
- **Van de**: Tat ca `useReadContract` va `useBalance` deu hardcode `chainId: bsc.id` (56). Khi user chuyen sang Testnet (97), so du van hien thi cua Mainnet
- **Can sua**: Su dung `chainId` dong tu wagmi `useAccount()` thay vi hardcode

### B4. Transaction status khong tu dong cap nhat - THIEU
- **Van de**: Bang `transactions` khong cho UPDATE (`Can't UPDATE records`). Khi giao dich duoc xac nhan tren blockchain, trang thai trong DB van la "pending"
- **Can sua**: Them RLS policy cho UPDATE hoac dung edge function de cap nhat

### B5. Wallet Settings - CHUA SU DUNG
- **Van de**: File `WalletSettingsDialog.tsx` ton tai nhung khong duoc import/su dung o dau
- **Can kiem tra**: Xem co can thiet khong, neu khong thi xoa

### B6. Realtime updates cho mint requests - CHUA CO
- **Van de**: Sau khi user claim FUN, khong co realtime subscription de cap nhat trang thai khi Admin ky va gui TX
- **Can them**: Supabase Realtime subscription tren bang `pplp_mint_requests`

### B7. Auto-confirm TX sau khi Admin submit - THIEU
- **Van de**: Admin submit TX nhung trang thai khong tu dong chuyen tu "submitted" -> "confirmed"
- **Can them**: Polling transaction receipt trong `usePplpAdmin.ts`

### B8. Batch submit cho Admin - THIEU
- **Van de**: Admin phai ky va submit tung mint request mot, khong co chuc nang xu ly hang loat
- **Can them**: Batch signing va batch submit trong PplpMintTab

---

## C. KE HOACH HOAN THIEN

### Giai doan 1: Sua loi co ban (Uu tien cao)

**1.1. Tao ClaimFunDialog** - Cho phep user claim FUN da activated
- Tao `src/hooks/useClaimFun.ts` - Goi `contract.claim(amount)` 
- Tao `src/components/wallet/ClaimFunDialog.tsx` - UI tuong tu ActivateDialog
- Cap nhat `FunBalanceCard.tsx` - Them nut "Claim" khi co activated balance
- Cap nhat `WalletCenterContainer.tsx` - Them state va dialog

**1.2. Them FUN vao danh sach token** 
- Cap nhat `useTokenBalances.ts` - Them FUN token voi logo va contract address
- Xu ly doc balance tren ca Mainnet va Testnet dua vao chainId hien tai

**1.3. Sua token balances theo network**
- Cap nhat `useTokenBalances.ts` - Dung chainId dong thay vi hardcode `bsc.id`

### Giai doan 2: Cap nhat trang thai (Uu tien trung binh)

**2.1. Them RLS policy cho transactions UPDATE**
- Them migration: cho phep user update status cua transaction cua minh
- Sua `useTransactionHistory.ts` de tu dong cap nhat status khi receipt co

**2.2. Realtime cho mint requests**
- Them Supabase Realtime subscription trong `ClaimRewardsCard` hoac `LightScoreDashboard`
- Hien thi thong bao khi Admin ky hoac TX duoc confirmed

### Giai doan 3: Cai thien Admin (Uu tien thap)

**3.1. Auto-confirm TX**
- Them polling trong `usePplpAdmin.ts` sau khi submit TX

**3.2. Batch submit**
- Them chuc nang chon nhieu requests va ky/submit cung luc

---

## D. CHI TIET KY THUAT

### File can tao moi:
1. `src/hooks/useClaimFun.ts` - Hook goi `contract.claim(amount)` bang vi user
2. `src/components/wallet/ClaimFunDialog.tsx` - Dialog chon so luong va xac nhan claim

### File can sua:
1. `src/components/wallet/FunBalanceCard.tsx` - Them nut Claim khi activated > 0
2. `src/components/wallet/WalletCenterContainer.tsx` - Them showClaimFunDialog state
3. `src/hooks/useTokenBalances.ts` - Them FUN token, dung chainId dong
4. `src/hooks/useFunBalance.ts` - Them flowing balance (balanceOf result)

### Database migration can thiet:
- Them RLS policy: `Users can update their own transactions` cho bang `transactions`
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.pplp_mint_requests`
