/**
 * Swap service: PancakeSwap Router V2 for CAMLY pairs, 0x API for others.
 */

import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { WALLET_TOKENS, type WalletToken } from '@/lib/tokens';
import {
  SWAP_CONFIG,
  PANCAKE_ROUTER_ABI,
  ERC20_ABI,
  type SwappableSymbol,
} from '@/config/swap';
import { supabase } from '@/integrations/supabase/client';

/* ─── Token helpers ─── */

const findToken = (symbol: SwappableSymbol): WalletToken => {
  const t = WALLET_TOKENS.find(tk => tk.symbol === symbol);
  if (!t) throw new Error(`Token ${symbol} not found`);
  return t;
};

/** Get on-chain address: use WBNB for native BNB in router paths */
const routerAddress = (token: WalletToken): `0x${string}` =>
  token.address ?? SWAP_CONFIG.WBNB;

const isNativeBnb = (token: WalletToken) => token.address === null;

const involvesCamly = (from: SwappableSymbol, to: SwappableSymbol) =>
  from === 'CAMLY' || to === 'CAMLY';

/* ─── Quote types ─── */

export interface SwapQuote {
  fromSymbol: SwappableSymbol;
  toSymbol: SwappableSymbol;
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  route: 'pancakeswap' | '0x';
  path?: `0x${string}`[];
  estimatedGas?: string;
  expiresAt: number;
  raw?: any;
}

/* ─── Build path for PancakeSwap ─── */

function buildPancakePath(from: WalletToken, to: WalletToken): `0x${string}`[] {
  const a = routerAddress(from);
  const b = routerAddress(to);
  // If either is BNB (WBNB) go direct; otherwise route via WBNB
  if (a === SWAP_CONFIG.WBNB || b === SWAP_CONFIG.WBNB) return [a, b];
  return [a, SWAP_CONFIG.WBNB, b];
}

/* ─── Get quote ─── */

export async function getSwapQuote(
  fromSymbol: SwappableSymbol,
  toSymbol: SwappableSymbol,
  amount: string,
  wagmiConfig: any,
): Promise<SwapQuote> {
  const fromToken = findToken(fromSymbol);
  const toToken = findToken(toSymbol);
  const amountIn = parseUnits(amount, fromToken.decimals);

  if (involvesCamly(fromSymbol, toSymbol)) {
    return getPancakeQuote(fromSymbol, toSymbol, fromToken, toToken, amount, amountIn, wagmiConfig);
  }
  return getZeroXQuote(fromSymbol, toSymbol, fromToken, toToken, amount, amountIn);
}

async function getPancakeQuote(
  fromSymbol: SwappableSymbol,
  toSymbol: SwappableSymbol,
  fromToken: WalletToken,
  toToken: WalletToken,
  amount: string,
  amountIn: bigint,
  wagmiConfig: any,
): Promise<SwapQuote> {
  const path = buildPancakePath(fromToken, toToken);

  const amounts = await readContract(wagmiConfig, {
    address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
    abi: PANCAKE_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountIn, path],
    chainId: SWAP_CONFIG.CHAIN_ID,
  }) as bigint[];

  const amountOut = amounts[amounts.length - 1];
  const slippageFactor = BigInt(10000 - SWAP_CONFIG.DEFAULT_SLIPPAGE);
  const amountOutMin = (amountOut * slippageFactor) / 10000n;

  return {
    fromSymbol,
    toSymbol,
    amountIn: amount,
    amountOut: formatUnits(amountOut, toToken.decimals),
    amountOutMin: formatUnits(amountOutMin, toToken.decimals),
    route: 'pancakeswap',
    path,
    expiresAt: Date.now() + SWAP_CONFIG.QUOTE_TTL_MS,
  };
}

async function getZeroXQuote(
  fromSymbol: SwappableSymbol,
  toSymbol: SwappableSymbol,
  fromToken: WalletToken,
  toToken: WalletToken,
  amount: string,
  amountIn: bigint,
): Promise<SwapQuote> {
  const sellToken = fromToken.address ?? SWAP_CONFIG.NATIVE_TOKEN_ADDRESS;
  const buyToken = toToken.address ?? SWAP_CONFIG.NATIVE_TOKEN_ADDRESS;

  const query = new URLSearchParams({
    sellToken,
    buyToken,
    sellAmount: amountIn.toString(),
    chainId: SWAP_CONFIG.CHAIN_ID.toString(),
  }).toString();

  const { data, error } = await supabase.functions.invoke('swap-quote', {
    body: { path: '/swap/v1/quote', query },
  });

  if (error || !data || data._status >= 400) {
    throw new Error(data?.reason || data?.validationErrors?.[0]?.reason || 'Không thể lấy báo giá swap');
  }

  const outRaw = BigInt(data.buyAmount);
  const slippageFactor = BigInt(10000 - SWAP_CONFIG.DEFAULT_SLIPPAGE);
  const amountOutMin = (outRaw * slippageFactor) / 10000n;

  return {
    fromSymbol,
    toSymbol,
    amountIn: amount,
    amountOut: formatUnits(outRaw, toToken.decimals),
    amountOutMin: formatUnits(amountOutMin, toToken.decimals),
    route: '0x',
    estimatedGas: data.estimatedGas,
    expiresAt: Date.now() + SWAP_CONFIG.QUOTE_TTL_MS,
    raw: data,
  };
}

/* ─── Approval ─── */

export async function requiresApproval(
  symbol: SwappableSymbol,
  amount: string,
  owner: `0x${string}`,
  spender: `0x${string}`,
  wagmiConfig: any,
): Promise<boolean> {
  const token = findToken(symbol);
  if (isNativeBnb(token)) return false;

  const allowance = await readContract(wagmiConfig, {
    address: token.address!,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
    chainId: SWAP_CONFIG.CHAIN_ID,
  }) as bigint;

  return allowance < parseUnits(amount, token.decimals);
}

export async function approveToken(
  symbol: SwappableSymbol,
  spender: `0x${string}`,
  wagmiConfig: any,
): Promise<`0x${string}`> {
  const token = findToken(symbol);
  if (isNativeBnb(token)) throw new Error('BNB không cần approve');

  const hash = await writeContract(wagmiConfig, {
    address: token.address!,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, SWAP_CONFIG.MAX_APPROVAL],
    chainId: SWAP_CONFIG.CHAIN_ID,
  });

  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: SWAP_CONFIG.CHAIN_ID });
  return hash;
}

/* ─── Execute swap ─── */

export async function executeSwap(
  quote: SwapQuote,
  account: `0x${string}`,
  wagmiConfig: any,
): Promise<`0x${string}`> {
  if (quote.route === 'pancakeswap') {
    return executePancakeSwap(quote, account, wagmiConfig);
  }
  return executeZeroXSwap(quote, account, wagmiConfig);
}

async function executePancakeSwap(
  quote: SwapQuote,
  account: `0x${string}`,
  wagmiConfig: any,
): Promise<`0x${string}`> {
  const fromToken = findToken(quote.fromSymbol);
  const toToken = findToken(quote.toSymbol);
  const amountIn = parseUnits(quote.amountIn, fromToken.decimals);
  const amountOutMin = parseUnits(quote.amountOutMin, toToken.decimals);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + SWAP_CONFIG.DEADLINE_SECONDS);
  const path = quote.path!;

  let hash: `0x${string}`;

  if (isNativeBnb(fromToken)) {
    // BNB → Token
    hash = await writeContract(wagmiConfig, {
      address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
      abi: PANCAKE_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, path, account, deadline],
      value: amountIn,
      chainId: SWAP_CONFIG.CHAIN_ID,
    });
  } else if (isNativeBnb(toToken)) {
    // Token → BNB
    hash = await writeContract(wagmiConfig, {
      address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
      abi: PANCAKE_ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, path, account, deadline],
      chainId: SWAP_CONFIG.CHAIN_ID,
    });
  } else {
    // Token → Token
    hash = await writeContract(wagmiConfig, {
      address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
      abi: PANCAKE_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, account, deadline],
      chainId: SWAP_CONFIG.CHAIN_ID,
    });
  }

  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: SWAP_CONFIG.CHAIN_ID });
  return hash;
}

async function executeZeroXSwap(
  quote: SwapQuote,
  account: `0x${string}`,
  wagmiConfig: any,
): Promise<`0x${string}`> {
  const raw = quote.raw;
  if (!raw?.to || !raw?.data) throw new Error('Thiếu dữ liệu giao dịch 0x');

  const fromToken = findToken(quote.fromSymbol);
  const value = isNativeBnb(fromToken) ? BigInt(raw.value || '0') : 0n;

  // Use sendTransaction via writeContract won't work for raw tx — use wagmi sendTransaction
  const { sendTransaction, waitForTransactionReceipt: waitTx } = await import('@wagmi/core');
  
  const hash = await sendTransaction(wagmiConfig, {
    to: raw.to as `0x${string}`,
    data: raw.data as `0x${string}`,
    value,
    chainId: SWAP_CONFIG.CHAIN_ID,
  });

  await waitTx(wagmiConfig, { hash, chainId: SWAP_CONFIG.CHAIN_ID });
  return hash;
}

/* ─── Helpers ─── */

export function quoteExpired(quote: SwapQuote): boolean {
  return Date.now() > quote.expiresAt;
}

export function getSpender(quote: SwapQuote): `0x${string}` {
  if (quote.route === 'pancakeswap') return SWAP_CONFIG.PANCAKE_ROUTER_V2;
  return (quote.raw?.allowanceTarget || quote.raw?.to) as `0x${string}`;
}

export function mapSwapError(err: any): string {
  const msg = err?.message || err?.toString() || '';
  if (msg.includes('user rejected') || msg.includes('User denied')) return 'Bạn đã huỷ giao dịch';
  if (msg.includes('insufficient funds') || msg.includes('INSUFFICIENT')) return 'Số dư không đủ';
  if (msg.includes('EXPIRED') || msg.includes('deadline')) return 'Báo giá đã hết hạn, vui lòng thử lại';
  if (msg.includes('-32002') || msg.includes('pending')) return 'Có giao dịch đang chờ xử lý trong ví';
  if (msg.includes('TRANSFER_FAILED')) return 'Giao dịch thất bại, có thể do slippage quá thấp';
  return `Lỗi swap: ${msg.slice(0, 120)}`;
}
