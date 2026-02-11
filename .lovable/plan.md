
# Thong Ke Tinh Nang Vi (Wallet) - Hoan Thanh va Chua Hoan Thanh

## A. DA HOAN THANH (17+ thanh phan)

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
| Token Balances | `useTokenBalances.ts` | Doc so du BNB, USDT, BTCB, CAMLY, FUN tu on-chain |
| Price Fetching | `useTokenBalances.ts` | Gia tu CoinGecko, cap nhat moi 30s |
| Dynamic chainId | `useTokenBalances.ts` | ✅ Doc balance theo network hien tai (Mainnet/Testnet) |
| FUN Token display | `useTokenBalances.ts` | ✅ FUN token hien thi trong danh sach tai san |
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
| Claim FUN Dialog | `ClaimFunDialog.tsx` | ✅ Chuyen FUN tu ACTIVATED sang vi ca nhan |
| FUN Balance on-chain | `useFunBalance.ts` | Doc locked/activated tu contract alloc() |

### 6. Lich su tang thuong
| Thanh phan | File | Mo ta |
|------------|------|-------|
| Donation History Tab | `DonationHistoryTab.tsx` | Tab gui/nhan, thong ke, xuat CSV |
| Gift Celebration replay | `DonationHistoryTab.tsx` | Click xem lai the chuc mung voi hieu ung goc |

### 7. Database
| Thanh phan | Mo ta |
|------------|-------|
| Transactions UPDATE RLS | ✅ User co the cap nhat status giao dich cua minh |
| Mint Requests Realtime | ✅ pplp_mint_requests duoc them vao supabase_realtime |

---

## B. CHUA HOAN THANH / CAN CAI THIEN (4 muc con lai)

### B5. Wallet Settings - CHUA SU DUNG
- File `WalletSettingsDialog.tsx` ton tai nhung khong duoc su dung

### B6. Realtime updates cho mint requests - CAN TICH HOP UI
- Realtime da duoc bat (publication), can them subscription trong UI

### B7. Auto-confirm TX sau khi Admin submit - THIEU
- Them polling transaction receipt trong `usePplpAdmin.ts`

### B8. Batch submit cho Admin - THIEU
- Batch signing va batch submit trong PplpMintTab
