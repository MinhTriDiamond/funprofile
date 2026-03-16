/**
 * Swap service: PancakeSwap Router V2 for ALL pairs on BSC.
 */

import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { bsc } from 'wagmi/chains';
import { WALLET_TOKENS, type WalletToken } from '@/lib/tokens';
import {
  SWAP_CONFIG,
  PANCAKE_ROUTER_ABI,
  ERC20_ABI,
  type SwappableSymbol,
} from '@/config/swap';

/* ─── Token helpers ─── */

const findToken = (symbol: SwappableSymbol): WalletToken => {
  const t = WALLET_TOKENS.find(tk => tk.symbol === symbol);
  if (!t) throw new Error(`Token ${symbol} not found`);
  return t;
};

const tokenAddress = (token: WalletToken): `0x${string}` =>
  token.address ?? SWAP_CONFIG.WBNB;

const isNativeBnb = (token: WalletToken) => token.address === null;

/* ─── Quote types ─── */

export interface SwapQuote {
  fromSymbol: SwappableSymbol;
  toSymbol: SwappableSymbol;
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  route: 'pancakeswap';
  path: `0x${string}`[];
  expiresAt: number;
}

/* ─── Build path for PancakeSwap ─── */

function buildPath(from: WalletToken, to: WalletToken): `0x${string}`[] {
  const a = tokenAddress(from);
  const b = tokenAddress(to);
  // If either token is WBNB (native BNB), direct path
  if (a === SWAP_CONFIG.WBNB || b === SWAP_CONFIG.WBNB) return [a, b];
  // Otherwise route through WBNB
  return [a, SWAP_CONFIG.WBNB, b];
}

/* ─── Get quote (always PancakeSwap) ─── */

export async function getSwapQuote(
  fromSymbol: SwappableSymbol,
  toSymbol: SwappableSymbol,
  amount: string,
  wagmiConfig: any,
): Promise<SwapQuote> {
  const fromToken = findToken(fromSymbol);
  const toToken = findToken(toSymbol);
  const amountIn = parseUnits(amount, fromToken.decimals);
  const path = buildPath(fromToken, toToken);

  const amounts = await readContract(wagmiConfig, {
    address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
    abi: PANCAKE_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountIn, path],
  } as any) as bigint[];

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
  } as any) as bigint;

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
    chain: bsc,
  } as any);

  await waitForTransactionReceipt(wagmiConfig, { hash });
  return hash;
}

/* ─── Execute swap (always PancakeSwap) ─── */

export async function executeSwap(
  quote: SwapQuote,
  account: `0x${string}`,
  wagmiConfig: any,
): Promise<`0x${string}`> {
  const fromToken = findToken(quote.fromSymbol);
  const toToken = findToken(quote.toSymbol);
  const amountIn = parseUnits(quote.amountIn, fromToken.decimals);
  const amountOutMin = parseUnits(quote.amountOutMin, toToken.decimals);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + SWAP_CONFIG.DEADLINE_SECONDS);
  const path = quote.path;

  let hash: `0x${string}`;

  if (isNativeBnb(fromToken)) {
    hash = await writeContract(wagmiConfig, {
      address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
      abi: PANCAKE_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, path, account, deadline],
      value: amountIn,
      chain: bsc,
    } as any);
  } else if (isNativeBnb(toToken)) {
    hash = await writeContract(wagmiConfig, {
      address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
      abi: PANCAKE_ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, path, account, deadline],
      chain: bsc,
    } as any);
  } else {
    hash = await writeContract(wagmiConfig, {
      address: SWAP_CONFIG.PANCAKE_ROUTER_V2,
      abi: PANCAKE_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, account, deadline],
      chain: bsc,
    } as any);
  }

  await waitForTransactionReceipt(wagmiConfig, { hash });
  return hash;
}

/* ─── Helpers ─── */

export function quoteExpired(quote: SwapQuote): boolean {
  return Date.now() > quote.expiresAt;
}

export function getSpender(_quote: SwapQuote): `0x${string}` {
  return SWAP_CONFIG.PANCAKE_ROUTER_V2;
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
