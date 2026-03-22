

## Fix build errors + Continue Phase 5

### Build Error Fix (immediate)
`SwapCard` in `WalletTransactionHistory.tsx` references `t` but doesn't declare it. Add `const { t } = useLanguage();` at line 233.

**File**: `src/components/profile/WalletTransactionHistory.tsx`
- Line 232-233: Add `const { t } = useLanguage();` inside `SwapCard` function

### Phase 5: Admin & Pages i18n
Continue with remaining files. Will scan and update all admin components and static pages with hardcoded Vietnamese text.

