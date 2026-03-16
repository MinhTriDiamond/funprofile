import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useSwitchChain, useConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownUp, RefreshCw, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WALLET_TOKENS } from '@/lib/tokens';
import { SWAP_CONFIG, SWAPPABLE_SYMBOLS, type SwappableSymbol } from '@/config/swap';
import {
  getSwapQuote,
  executeSwap,
  requiresApproval,
  approveToken,
  quoteExpired,
  getSpender,
  mapSwapError,
  type SwapQuote,
} from '@/modules/wallet/services/swapAsset';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SwapTabProps {
  walletAddress: `0x${string}` | undefined;
  onSuccess?: () => void;
}

export function SwapTab({ walletAddress, onSuccess }: SwapTabProps) {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const wagmiConfig = useConfig();

  const [fromSymbol, setFromSymbol] = useState<SwappableSymbol>('BNB');
  const [toSymbol, setToSymbol] = useState<SwappableSymbol>('USDT');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { tokens, refetch: refetchBalances } = useTokenBalances({ customAddress: walletAddress });

  const swappableTokens = useMemo(
    () => WALLET_TOKENS.filter(t => (SWAPPABLE_SYMBOLS as readonly string[]).includes(t.symbol)),
    [],
  );

  const fromToken = swappableTokens.find(t => t.symbol === fromSymbol)!;
  const toToken = swappableTokens.find(t => t.symbol === toSymbol)!;

  const fromBalance = useMemo(() => {
    const t = tokens.find(tk => tk.symbol === fromSymbol);
    return t ? Number(t.balance) : 0;
  }, [tokens, fromSymbol]);

  const isWrongChain = chainId !== SWAP_CONFIG.CHAIN_ID;

  // Fetch quote with debounce
  const fetchQuote = useCallback(async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || fromSymbol === toSymbol) {
      setQuote(null);
      return;
    }
    setIsQuoting(true);
    setError('');
    try {
      const q = await getSwapQuote(fromSymbol, toSymbol, amount, wagmiConfig);
      setQuote(q);

      // Check approval
      if (walletAddress) {
        const spender = getSpender(q);
        const needs = await requiresApproval(fromSymbol, amount, walletAddress, spender, wagmiConfig);
        setNeedsApproval(needs);
      }
    } catch (err: any) {
      setError(mapSwapError(err));
      setQuote(null);
    } finally {
      setIsQuoting(false);
    }
  }, [amount, fromSymbol, toSymbol, walletAddress, wagmiConfig]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }
    debounceRef.current = setTimeout(fetchQuote, SWAP_CONFIG.QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [amount, fromSymbol, toSymbol, fetchQuote]);

  const handleFlip = useCallback(() => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setAmount('');
    setQuote(null);
    setNeedsApproval(false);
  }, [fromSymbol, toSymbol]);

  const handleApprove = useCallback(async () => {
    if (!quote || !walletAddress) return;
    setIsApproving(true);
    try {
      const spender = getSpender(quote);
      await approveToken(fromSymbol, spender, wagmiConfig);
      setNeedsApproval(false);
      toast.success(`Đã approve ${fromSymbol}`);
    } catch (err: any) {
      toast.error(mapSwapError(err));
    } finally {
      setIsApproving(false);
    }
  }, [quote, walletAddress, fromSymbol, wagmiConfig]);

  const handleSwap = useCallback(async () => {
    if (!quote || !walletAddress) return;
    if (quoteExpired(quote)) {
      toast.error('Báo giá đã hết hạn, đang lấy lại...');
      fetchQuote();
      return;
    }
    setIsSwapping(true);
    try {
      const hash = await executeSwap(quote, walletAddress, wagmiConfig);
      toast.success(`Swap thành công! TX: ${hash.slice(0, 10)}...`);
      setAmount('');
      setQuote(null);
      refetchBalances();
      onSuccess?.();
    } catch (err: any) {
      toast.error(mapSwapError(err));
    } finally {
      setIsSwapping(false);
    }
  }, [quote, walletAddress, wagmiConfig, fetchQuote, refetchBalances, onSuccess]);

  const handleMax = useCallback(() => {
    if (fromSymbol === 'BNB') {
      // Reserve gas
      setAmount(Math.max(0, fromBalance - 0.005).toFixed(6));
    } else {
      setAmount(fromBalance.toString());
    }
  }, [fromBalance, fromSymbol]);

  // Token selector dropdown
  const TokenSelector = ({ value, onChange, excludeSymbol }: {
    value: SwappableSymbol;
    onChange: (s: SwappableSymbol) => void;
    excludeSymbol: SwappableSymbol;
  }) => {
    const selected = swappableTokens.find(t => t.symbol === value)!;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors min-w-[120px]">
            <img src={selected.logo} alt={selected.symbol} className="w-6 h-6 rounded-full" />
            <span className="font-semibold text-foreground">{selected.symbol}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 bg-background z-50">
          {swappableTokens
            .filter(t => t.symbol !== excludeSymbol)
            .map(t => (
              <DropdownMenuItem
                key={t.symbol}
                onClick={() => onChange(t.symbol as SwappableSymbol)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <img src={t.logo} alt={t.symbol} className="w-5 h-5 rounded-full" />
                <span className="font-medium">{t.symbol}</span>
                <span className="text-xs text-muted-foreground ml-auto">{t.name}</span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Vui lòng kết nối ví để swap token.
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <p className="text-foreground font-medium">Vui lòng chuyển sang BNB Smart Chain</p>
        <Button
          onClick={() => switchChain({ chainId: bsc.id })}
          className="bg-primary hover:bg-primary/90"
        >
          Chuyển mạng
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* From */}
      <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Bán</span>
          <button
            onClick={handleMax}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Số dư: {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} — MAX
          </button>
        </div>
        <div className="flex items-center gap-3">
          <TokenSelector
            value={fromSymbol}
            onChange={(s) => { setFromSymbol(s); setQuote(null); setAmount(''); }}
            excludeSymbol={toSymbol}
          />
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            className="flex-1 bg-transparent text-right text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Flip button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={handleFlip}
          className="bg-background border-4 border-muted rounded-xl p-2 hover:bg-muted transition-colors shadow-sm"
        >
          <ArrowDownUp className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* To */}
      <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
        <span className="text-sm text-muted-foreground font-medium">Mua</span>
        <div className="flex items-center gap-3">
          <TokenSelector
            value={toSymbol}
            onChange={(s) => { setToSymbol(s); setQuote(null); }}
            excludeSymbol={fromSymbol}
          />
          <div className="flex-1 text-right text-2xl font-bold text-foreground">
            {isQuoting ? (
              <Skeleton className="h-8 w-32 ml-auto" />
            ) : quote ? (
              Number(quote.amountOut).toLocaleString(undefined, { maximumFractionDigits: 8 })
            ) : (
              <span className="text-muted-foreground/50">0.00</span>
            )}
          </div>
        </div>
      </div>

      {/* Quote details */}
      {quote && !isQuoting && (
        <div className="bg-muted/30 rounded-xl p-3 text-sm space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Tối thiểu nhận</span>
            <span className="font-medium text-foreground">
              {Number(quote.amountOutMin).toLocaleString(undefined, { maximumFractionDigits: 8 })} {toSymbol}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Slippage</span>
            <span>{SWAP_CONFIG.DEFAULT_SLIPPAGE / 100}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Route</span>
            <span className="capitalize">{quote.route === 'pancakeswap' ? 'PancakeSwap V2' : '0x Aggregator'}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Action button */}
      {needsApproval && quote ? (
        <Button
          onClick={handleApprove}
          disabled={isApproving}
          className="w-full h-14 text-lg font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
        >
          {isApproving ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang approve...</>
          ) : (
            `Approve ${fromSymbol}`
          )}
        </Button>
      ) : (
        <Button
          onClick={handleSwap}
          disabled={!quote || isSwapping || isQuoting || !!error}
          className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90"
        >
          {isSwapping ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang swap...</>
          ) : isQuoting ? (
            <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Đang lấy giá...</>
          ) : (
            'Swap'
          )}
        </Button>
      )}
    </div>
  );
}
