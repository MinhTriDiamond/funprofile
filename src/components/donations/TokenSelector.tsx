import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

// Token logos
import funLogo from '@/assets/tokens/fun-logo.png';
import camlyLogo from '@/assets/tokens/camly-logo.webp';
import bnbLogo from '@/assets/tokens/bnb-logo.webp';

export interface TokenOption {
  symbol: string;
  name: string;
  address: string | null; // null for native BNB
  decimals: number;
  logo: string;
  color: string;
}

export const SUPPORTED_TOKENS: TokenOption[] = [
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
  {
    symbol: 'BNB',
    name: 'BNB',
    address: null,
    decimals: 18,
    logo: bnbLogo,
    color: 'from-amber-400 to-yellow-300',
  },
];

interface TokenSelectorProps {
  selectedToken: TokenOption;
  onSelect: (token: TokenOption) => void;
}

export const TokenSelector = ({ selectedToken, onSelect }: TokenSelectorProps) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SUPPORTED_TOKENS.map((token) => (
        <button
          key={token.symbol}
          type="button"
          onClick={() => onSelect(token)}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200',
            selectedToken.symbol === token.symbol
              ? 'border-gold bg-gradient-to-br from-gold/20 to-amber-500/10 shadow-md'
              : 'border-border hover:border-gold/50 hover:bg-muted/50'
          )}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 overflow-hidden">
            <img 
              src={token.logo} 
              alt={token.symbol} 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-semibold text-sm">{token.symbol}</span>
        </button>
      ))}
      <button
        type="button"
        disabled
        className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 opacity-50 cursor-not-allowed"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 bg-muted">
          <Plus className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="font-semibold text-sm text-muted-foreground">Khác</span>
      </button>
    </div>
  );
};
