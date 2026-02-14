

## Add Prominent Claim Rewards Section to Wallet Page

Redesign the Claim Rewards area in the Wallet page to match the play.fun.rich/wallet layout, replacing the current small banner with a full card section.

### What Changes

**Replace the existing reward banner** (the gradient bar with "Claimable: X CAMLY" text) with a dedicated "Claim Rewards" card that includes:

1. **Header**: "Claim Rewards" title with description "Nhan thuong CAMLY tu hoat dong tren FUN PROFILE"
2. **Valentine banner** (reuse existing Valentine styling)
3. **4 stat boxes in a 2x2 grid**:
   - Co the Claim (claimable amount)
   - Cho duyet (pending approval amount)
   - Da Claim (already claimed amount)
   - Tong da nhan (total reward earned)
4. **Claim button** - "Ket noi vi de Claim" when disconnected, or active claim button when connected
5. **Progress bars**:
   - Minimum threshold: X / 200,000 CAMLY
   - Daily limit: X / 500,000 CAMLY
6. **Info text** explaining rules (minimum threshold, admin approval, daily limit)

### Technical Details

**File: `src/components/wallet/WalletCenterContainer.tsx`**
- Replace the inline reward banner (lines 535-599) with a new `<ClaimRewardsSection>` component
- Pass existing state: `claimableReward`, `claimedAmount`, `dailyClaimed`, `rewardStats`, `camlyPrice`, `isConnected`, `profile?.reward_status`

**New file: `src/components/wallet/ClaimRewardsSection.tsx`**
- Standalone card component matching play.fun.rich design
- 2x2 grid for stats: claimable, pending (total_reward - claimedAmount - claimableReward or from reward_status), claimed, total
- Progress bars with thresholds (200,000 minimum, 500,000 daily)
- Conditional button: disabled if not connected, disabled if pending approval, active if approved
- Valentine banner (date-conditional, currently active)
- Info footer with 3 rules

**No database or backend changes needed** - all data already available from existing hooks and state.
