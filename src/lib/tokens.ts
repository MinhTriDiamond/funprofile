/**
 * Centralized token metadata for BSC wallet operations.
 */

import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import usdtLogo from '@/assets/tokens/usdt-logo.webp';
import btcbLogo from '@/assets/tokens/btcb-logo.webp';
import camlyLogo from '@/assets/tokens/camly-logo.webp';
import funLogo from '@/assets/tokens/fun-logo.png';

export interface WalletToken {
  symbol: string;
  name: string;
  address: `0x${string}` | null; // null for native BNB
  decimals: number;
  logo: string;
  color: string;
}

export const WALLET_TOKENS: WalletToken[] = [
  {
    symbol: 'BNB',
    name: 'BNB',
    address: null,
    decimals: 18,
    logo: bnbLogo,
    color: 'from-amber-400 to-yellow-300',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    logo: usdtLogo,
    color: 'from-emerald-500 to-green-400',
  },
  {
    symbol: 'BTCB',
    name: 'Bitcoin BEP20',
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    decimals: 18,
    logo: btcbLogo,
    color: 'from-orange-500 to-amber-400',
  },
  {
    symbol: 'FUN',
    name: 'FUN Money',
    address: '0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2',
    decimals: 18,
    logo: funLogo,
    color: 'from-primary to-green-400',
  },
  {
    symbol: 'CAMLY',
    name: 'Camly Coin',
    address: '0x0910320181889feFDE0BB1Ca63962b0A8882e413',
    decimals: 3,
    logo: camlyLogo,
    color: 'from-purple-500 to-pink-400',
  },
];

/** BNB gas buffer to prevent failed transactions */
export const BNB_GAS_BUFFER = 0.002;

/** Find a token by symbol */
export const findToken = (symbol: string): WalletToken | undefined =>
  WALLET_TOKENS.find(t => t.symbol === symbol);
