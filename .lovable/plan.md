# FUN Money Minting System Integration Plan

## Status: Phase 1-3 Complete ✅ | Phase 4-5 Remaining

## Completed

### Phase 1: Database Tables ✅
- 14 new tables created (pplp_actions, pplp_scores, pplp_evidences, fun_distribution_logs, fun_pool_config, pplp_user_caps, pplp_action_caps, pplp_user_tiers, pplp_fraud_signals, pplp_device_registry, pplp_policies, pplp_user_nonces, pplp_epoch_caps, pplp_audits)
- RLS policies for all tables
- Performance indexes
- DB functions: get_next_nonce, check_user_cap_and_update, expire_old_mint_requests_v2
- Seed data: Policy v1.0.2, Pool Config (3 tiers), Action Caps (13 action types)

### Phase 2: Shared Modules ✅
- `_shared/pplp-types.ts` - Types, constants, action types, cascade distribution
- `_shared/pplp-crypto.ts` - SHA-256, canonical JSON, evidence hashing
- `_shared/pplp-eip712.ts` - EIP-712 domain, contract ABI, attester addresses
- `_shared/pplp-helper.ts` - Submit action, scoring helpers, admin client

### Phase 3: Edge Functions ✅
- `pplp-submit-action` - Submit light action + auto-trigger scoring
- `pplp-score-action` - 5-pillar scoring engine with cap checking
- `pplp-authorize-mint` - Admin mint authorization + cascade distribution
- `pplp-detect-fraud` - Bot/Sybil/Spam/Collusion detection
- `pplp-batch-processor` - Batch score unprocessed actions

## Remaining

### Phase 4: Frontend Hooks (viem/wagmi)
- [ ] `useFUNMoneyContract.ts` - Contract interaction (activate, claim, requestPPLPLock)
- [ ] `useMintRequest.ts` - Create mint requests (single + batch)
- [ ] `usePPLPActions.ts` - Fetch/submit PPLP actions, filter unminted
- [ ] `useFUNMoneyStats.ts` - Stats from DB (scored, minted, pending)
- [ ] `useUnmintedCount.ts` - Count unminted actions
- [ ] `useWalletMismatch.ts` - Detect wallet mismatch

### Phase 5: Frontend Components + Pages
- [ ] `src/pages/Mint.tsx` - Main mint page for users
- [ ] `src/pages/AdminMintApproval.tsx` - Admin approval page
- [ ] `src/components/mint/FUNMoneyBalanceCard.tsx` - Balance display
- [ ] `src/components/mint/FUNMoneyMintCard.tsx` - Single action card
- [ ] `src/components/mint/MintActionsList.tsx` - Actions list + batch mint
- [ ] `src/components/mint/TokenLifecyclePanel.tsx` - Locked→Activated→Flowing
- [ ] `src/components/mint/WalletMismatchAlert.tsx` - Mismatch warning
- [ ] Route integration in App.tsx
