import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";
const BSC_RPC = "https://bsc-dataseed.binance.org";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6": { symbol: "FUN", decimals: 18 },
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": { symbol: "WBNB", decimals: 18 },
};

interface TokenTransfer {
  transaction_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  address: string;
  block_timestamp: string;
}

// ── BSC RPC helpers ──

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function getBlockTimestamp(blockHex: string): Promise<string> {
  const block = await rpcCall("eth_getBlockByNumber", [blockHex, false]);
  if (!block?.timestamp) return new Date().toISOString();
  return new Date(parseInt(block.timestamp, 16) * 1000).toISOString();
}

async function fetchTransfersViaBscRpc(walletAddr: string): Promise<TokenTransfer[]> {
  const paddedAddr = "0x" + walletAddr.slice(2).padStart(64, "0");
  const allTransfers: TokenTransfer[] = [];
  const blockTimestampCache = new Map<string, string>();

  for (const [tokenAddr, tokenInfo] of Object.entries(KNOWN_TOKENS)) {
    // Fetch transfers TO wallet (received)
    const logsIn = await rpcCall("eth_getLogs", [{
      fromBlock: "0x1", toBlock: "latest",
      address: tokenAddr,
      topics: [TRANSFER_TOPIC, null, paddedAddr],
    }]);

    // Fetch transfers FROM wallet (sent)
    const logsOut = await rpcCall("eth_getLogs", [{
      fromBlock: "0x1", toBlock: "latest",
      address: tokenAddr,
      topics: [TRANSFER_TOPIC, paddedAddr, null],
    }]);

    const allLogs = [...(logsIn || []), ...(logsOut || [])];
    console.log(`BSC RPC: ${tokenInfo.symbol} found ${allLogs.length} logs for ${walletAddr}`);

    for (const log of allLogs) {
      const from = "0x" + (log.topics[1] as string).slice(26).toLowerCase();
      const to = "0x" + (log.topics[2] as string).slice(26).toLowerCase();
      const value = BigInt(log.data).toString();
      const blockHex = log.blockNumber as string;

      if (!blockTimestampCache.has(blockHex)) {
        blockTimestampCache.set(blockHex, await getBlockTimestamp(blockHex));
      }

      allTransfers.push({
        transaction_hash: log.transactionHash,
        from_address: from,
        to_address: to,
        value,
        address: tokenAddr,
        block_timestamp: blockTimestampCache.get(blockHex)!,
      });
    }
  }

  // Deduplicate by tx_hash + from + to + address
  const seen = new Set<string>();
  return allTransfers.filter((t) => {
    const key = `${t.transaction_hash}_${t.from_address}_${t.to_address}_${t.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Moralis fetcher ──

async function fetchTransfersViaMoralis(walletAddr: string, chain: string, moralisKey: string): Promise<TokenTransfer[] | null> {
  const allTransfers: TokenTransfer[] = [];
  let cursor: string | null = null;
  let page = 0;
  const MAX_PAGES = 20;

  do {
    const params = new URLSearchParams({ chain, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const url = `${MORALIS_BASE}/${walletAddr}/erc20/transfers?${params.toString()}`;
    console.log(`Moralis page ${page}: ${url}`);

    const res = await fetch(url, {
      headers: { "X-API-Key": moralisKey, Accept: "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Moralis error ${res.status}: ${errText}`);
      if (res.status === 401 || res.status === 429) {
        console.log("Moralis quota exceeded, falling back to BSC RPC");
        return null; // signal to use BSC RPC
      }
      break;
    }

    const data = await res.json();
    allTransfers.push(...(data.result || []));
    cursor = data.cursor || null;
    page++;
  } while (cursor && page < MAX_PAGES);

  return allTransfers;
}

// ── Main handler ──

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisKey = Deno.env.get("MORALIS_API_KEY");
    const supabase = createAdminClient();
    const body = await req.json();
    const { user_id, wallet_address, chain = "0x38", chain_id = 56 } = body;

    let userId = user_id;

    // ── Resolve wallet addresses ──
    let walletAddresses: string[] = [];

    if (wallet_address) {
      walletAddresses = [wallet_address.toLowerCase().trim()];
    }

    if (!walletAddresses.length && !userId) {
      return new Response(JSON.stringify({ error: "user_id or wallet_address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If user_id given, collect ALL wallet addresses from profile
    if (userId && !walletAddresses.length) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, public_wallet_address, wallet_address, external_wallet_address")
        .eq("id", userId)
        .single();

      if (!profile) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const addrs = new Set<string>();
      for (const field of ["public_wallet_address", "wallet_address", "external_wallet_address"] as const) {
        const val = (profile as any)[field]?.toLowerCase().trim();
        if (val && val.startsWith("0x") && val.length === 42) addrs.add(val);
      }

      // Treasury fallback
      if (addrs.size === 0) {
        const treasuryAddr = Deno.env.get("TREASURY_WALLET_ADDRESS")?.toLowerCase().trim();
        if (treasuryAddr) {
          addrs.add(treasuryAddr);
          console.log(`Using TREASURY_WALLET_ADDRESS fallback for user ${userId}`);
        }
      }

      walletAddresses = Array.from(addrs);

      if (!walletAddresses.length) {
        return new Response(JSON.stringify({ error: "User has no wallet address" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Resolve userId from wallet if not provided
    if (!userId && walletAddresses.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, public_wallet_address, wallet_address, external_wallet_address");
      const wa = walletAddresses[0];
      const match = profiles?.find((p: any) =>
        [p.public_wallet_address, p.wallet_address, p.external_wallet_address]
          .some((a: string | null) => a?.toLowerCase().trim() === wa)
      );
      if (!match) {
        return new Response(JSON.stringify({ error: "No user found for this wallet" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = match.id;
    }

    console.log(`Backfilling for user ${userId}, wallets: ${walletAddresses.join(", ")}`);

    // ── Fetch transfers for ALL wallets ──
    const allTransfers: TokenTransfer[] = [];

    for (const walletAddr of walletAddresses) {
      console.log(`Scanning wallet: ${walletAddr}`);

      // Try Moralis first, fallback to BSC RPC
      let transfers: TokenTransfer[] | null = null;
      if (moralisKey) {
        transfers = await fetchTransfersViaMoralis(walletAddr, chain, moralisKey);
      }

      if (transfers === null) {
        console.log(`Using BSC RPC for wallet ${walletAddr}`);
        transfers = await fetchTransfersViaBscRpc(walletAddr);
      }

      allTransfers.push(...transfers);
    }

    console.log(`Fetched ${allTransfers.length} total ERC20 transfers across ${walletAddresses.length} wallets`);

    // ── Get existing records to exclude ──
    const { data: donationTxs } = await supabase
      .from("donations")
      .select("tx_hash")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    const { data: swapTxs } = await supabase
      .from("swap_transactions")
      .select("tx_hash")
      .eq("user_id", userId);
    const { data: existingTransfers } = await supabase
      .from("wallet_transfers")
      .select("tx_hash, direction, token_symbol")
      .eq("user_id", userId);

    const donationHashes = new Set((donationTxs || []).map((d: any) => d.tx_hash?.toLowerCase()));
    const swapHashes = new Set((swapTxs || []).map((s: any) => s.tx_hash?.toLowerCase()));
    const existingTransferKeys = new Set(
      (existingTransfers || []).map((t: any) => `${t.tx_hash?.toLowerCase()}_${t.direction}_${t.token_symbol}`)
    );

    // Detect on-chain swaps (tx with both in and out for known tokens)
    const walletSet = new Set(walletAddresses);
    const txGroups = new Map<string, TokenTransfer[]>();
    for (const t of allTransfers) {
      const hash = (t.transaction_hash || "").toLowerCase();
      if (!hash) continue;
      if (!txGroups.has(hash)) txGroups.set(hash, []);
      txGroups.get(hash)!.push(t);
    }

    const onChainSwapHashes = new Set<string>();
    for (const [txHash, transfers] of txGroups) {
      let hasOut = false, hasIn = false;
      for (const t of transfers) {
        const tokenAddr = (t.address || "").toLowerCase();
        if (!KNOWN_TOKENS[tokenAddr]) continue;
        if (walletSet.has((t.from_address || "").toLowerCase())) hasOut = true;
        if (walletSet.has((t.to_address || "").toLowerCase())) hasIn = true;
      }
      if (hasOut && hasIn) onChainSwapHashes.add(txHash);
    }

    // ── Process transfers ──
    const processedTransfers: Array<{
      tx_hash: string; direction: string; token_symbol: string;
      token_address: string; amount: number; counterparty_address: string;
      created_at: string;
    }> = [];

    for (const t of allTransfers) {
      const txHash = (t.transaction_hash || "").toLowerCase();
      if (!txHash) continue;
      if (donationHashes.has(txHash) || swapHashes.has(txHash) || onChainSwapHashes.has(txHash)) continue;

      const tokenAddr = (t.address || "").toLowerCase();
      const tokenInfo = KNOWN_TOKENS[tokenAddr];
      if (!tokenInfo) continue;

      const from = (t.from_address || "").toLowerCase();
      const to = (t.to_address || "").toLowerCase();

      let direction: string;
      let counterparty: string;

      if (walletSet.has(from) && !walletSet.has(to)) {
        direction = "out";
        counterparty = to;
      } else if (walletSet.has(to) && !walletSet.has(from)) {
        direction = "in";
        counterparty = from;
      } else {
        continue;
      }

      const symbol = tokenInfo.symbol === "WBNB" ? "BNB" : tokenInfo.symbol;
      const key = `${txHash}_${direction}_${symbol}`;
      if (existingTransferKeys.has(key)) continue;

      const amount = Number(BigInt(t.value || "0")) / Math.pow(10, tokenInfo.decimals);

      processedTransfers.push({
        tx_hash: txHash, direction, token_symbol: symbol,
        token_address: tokenAddr, amount, counterparty_address: counterparty,
        created_at: t.block_timestamp || new Date().toISOString(),
      });
    }

    console.log(`Found ${processedTransfers.length} transfers (excluded ${donationHashes.size} donations, ${swapHashes.size} DB swaps, ${onChainSwapHashes.size} on-chain swaps)`);

    if (processedTransfers.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No new wallet transfers found",
        total_erc20: allTransfers.length,
        excluded_donations: donationHashes.size,
        excluded_swaps: swapHashes.size + onChainSwapHashes.size,
        inserted: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Insert ──
    const toInsert = processedTransfers.map((t) => ({
      user_id: userId, tx_hash: t.tx_hash, direction: t.direction,
      token_symbol: t.token_symbol, token_address: t.token_address,
      amount: t.amount, counterparty_address: t.counterparty_address,
      chain_id, status: "confirmed", created_at: t.created_at,
    }));

    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("wallet_transfers").insert(batch);
      if (error) {
        console.error(`Insert batch error:`, error.message);
        errors.push(error.message);
      } else {
        inserted += batch.length;
      }
    }

    const result = {
      success: true, user_id: userId,
      wallets: walletAddresses,
      total_erc20: allTransfers.length,
      excluded_donations: donationHashes.size,
      excluded_swaps: swapHashes.size + onChainSwapHashes.size,
      transfers_found: processedTransfers.length, inserted,
      errors: errors.length > 0 ? errors : undefined,
      transfers: processedTransfers.map((t) => ({
        tx_hash: t.tx_hash, direction: t.direction,
        detail: `${t.amount} ${t.token_symbol} ${t.direction === 'in' ? '← ' : '→ '}${t.counterparty_address.slice(0, 10)}...`,
        date: t.created_at,
      })),
    };

    console.log(`Backfill complete: ${inserted} inserted`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("backfill-wallet-transfers error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
