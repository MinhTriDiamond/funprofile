import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";
const BSC_RPC = "https://bsc-dataseed.binance.org";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BLOCK_CHUNK = 5000;

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6": { symbol: "FUN", decimals: 18 },
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": { symbol: "WBNB", decimals: 18 },
};

// CAMLY deployed around block 38_000_000 (mid-2024). Scan from there to save time.
const SCAN_FROM_BLOCK = 38_000_000;

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

const blockTimestampCache = new Map<string, string>();

async function getBlockTimestamp(blockHex: string): Promise<string> {
  if (blockTimestampCache.has(blockHex)) return blockTimestampCache.get(blockHex)!;
  try {
    const block = await rpcCall("eth_getBlockByNumber", [blockHex, false]);
    if (!block?.timestamp) return new Date().toISOString();
    const ts = new Date(parseInt(block.timestamp, 16) * 1000).toISOString();
    blockTimestampCache.set(blockHex, ts);
    return ts;
  } catch {
    return new Date().toISOString();
  }
}

async function fetchLogsChunked(
  tokenAddr: string,
  topic1: string | null,
  topic2: string | null,
  fromBlock: number,
  toBlock: number,
): Promise<any[]> {
  const allLogs: any[] = [];
  for (let start = fromBlock; start <= toBlock; start += BLOCK_CHUNK) {
    const end = Math.min(start + BLOCK_CHUNK - 1, toBlock);
    const topics = [TRANSFER_TOPIC, topic1, topic2];
    try {
      const logs = await rpcCall("eth_getLogs", [{
        fromBlock: "0x" + start.toString(16),
        toBlock: "0x" + end.toString(16),
        address: tokenAddr,
        topics,
      }]);
      if (logs?.length) allLogs.push(...logs);
    } catch (err) {
      console.warn(`eth_getLogs chunk ${start}-${end} error: ${err}`);
    }
  }
  return allLogs;
}

async function fetchTransfersViaBscRpc(walletAddr: string): Promise<TokenTransfer[]> {
  const paddedAddr = "0x" + walletAddr.slice(2).padStart(64, "0");
  const allTransfers: TokenTransfer[] = [];

  // Get current block number
  const latestHex = await rpcCall("eth_blockNumber", []);
  const latestBlock = parseInt(latestHex, 16);
  console.log(`BSC RPC: latest block ${latestBlock}, scanning from ${SCAN_FROM_BLOCK}`);

  for (const [tokenAddr, tokenInfo] of Object.entries(KNOWN_TOKENS)) {
    // Received
    const logsIn = await fetchLogsChunked(tokenAddr, null, paddedAddr, SCAN_FROM_BLOCK, latestBlock);
    // Sent
    const logsOut = await fetchLogsChunked(tokenAddr, paddedAddr, null, SCAN_FROM_BLOCK, latestBlock);

    const allLogs = [...logsIn, ...logsOut];
    console.log(`BSC RPC: ${tokenInfo.symbol} = ${allLogs.length} logs for ${walletAddr.slice(0, 10)}...`);

    for (const log of allLogs) {
      const from = "0x" + (log.topics[1] as string).slice(26).toLowerCase();
      const to = "0x" + (log.topics[2] as string).slice(26).toLowerCase();
      const value = BigInt(log.data).toString();

      allTransfers.push({
        transaction_hash: log.transactionHash,
        from_address: from,
        to_address: to,
        value,
        address: tokenAddr,
        block_timestamp: await getBlockTimestamp(log.blockNumber),
      });
    }
  }

  // Deduplicate
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

  do {
    const params = new URLSearchParams({ chain, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const url = `${MORALIS_BASE}/${walletAddr}/erc20/transfers?${params.toString()}`;

    const res = await fetch(url, {
      headers: { "X-API-Key": moralisKey, Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`Moralis error ${res.status}`);
      if (res.status === 401 || res.status === 429) return null;
      break;
    }

    const data = await res.json();
    allTransfers.push(...(data.result || []));
    cursor = data.cursor || null;
    page++;
  } while (cursor && page < 20);

  return allTransfers;
}

// ── Main ──

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisKey = Deno.env.get("MORALIS_API_KEY");
    const supabase = createAdminClient();
    const body = await req.json();
    const { user_id, wallet_address, chain = "0x38", chain_id = 56 } = body;
    let userId = user_id;

    // ── Resolve wallets ──
    let walletAddresses: string[] = [];

    if (wallet_address) {
      walletAddresses = [wallet_address.toLowerCase().trim()];
    }

    if (!walletAddresses.length && !userId) {
      return new Response(JSON.stringify({ error: "user_id or wallet_address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      for (const field of ["public_wallet_address", "wallet_address", "external_wallet_address"]) {
        const val = (profile as any)[field]?.toLowerCase().trim();
        if (val && val.startsWith("0x") && val.length === 42) addrs.add(val);
      }

      if (addrs.size === 0) {
        const treasuryAddr = Deno.env.get("TREASURY_WALLET_ADDRESS")?.toLowerCase().trim();
        if (treasuryAddr) addrs.add(treasuryAddr);
      }

      walletAddresses = Array.from(addrs);
      if (!walletAddresses.length) {
        return new Response(JSON.stringify({ error: "User has no wallet address" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    console.log(`Backfilling user ${userId}, wallets: ${walletAddresses.join(", ")}`);

    // ── Fetch transfers ──
    const allTransfers: TokenTransfer[] = [];

    for (const walletAddr of walletAddresses) {
      let transfers: TokenTransfer[] | null = null;
      if (moralisKey) transfers = await fetchTransfersViaMoralis(walletAddr, chain, moralisKey);
      if (transfers === null) {
        console.log(`BSC RPC fallback for ${walletAddr}`);
        transfers = await fetchTransfersViaBscRpc(walletAddr);
      }
      allTransfers.push(...transfers);
    }

    console.log(`Total: ${allTransfers.length} transfers across ${walletAddresses.length} wallets`);

    // ── Exclude existing ──
    const { data: donationTxs } = await supabase
      .from("donations").select("tx_hash")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    const { data: swapTxs } = await supabase
      .from("swap_transactions").select("tx_hash").eq("user_id", userId);
    const { data: existingTransfers } = await supabase
      .from("wallet_transfers").select("tx_hash, direction, token_symbol").eq("user_id", userId);

    const donationHashes = new Set((donationTxs || []).map((d: any) => d.tx_hash?.toLowerCase()));
    const swapHashes = new Set((swapTxs || []).map((s: any) => s.tx_hash?.toLowerCase()));
    const existingKeys = new Set(
      (existingTransfers || []).map((t: any) => `${t.tx_hash?.toLowerCase()}_${t.direction}_${t.token_symbol}`)
    );

    const walletSet = new Set(walletAddresses);
    const txGroups = new Map<string, TokenTransfer[]>();
    for (const t of allTransfers) {
      const h = (t.transaction_hash || "").toLowerCase();
      if (!h) continue;
      if (!txGroups.has(h)) txGroups.set(h, []);
      txGroups.get(h)!.push(t);
    }

    const onChainSwapHashes = new Set<string>();
    for (const [txHash, txs] of txGroups) {
      let hasOut = false, hasIn = false;
      for (const t of txs) {
        if (!KNOWN_TOKENS[(t.address || "").toLowerCase()]) continue;
        if (walletSet.has((t.from_address || "").toLowerCase())) hasOut = true;
        if (walletSet.has((t.to_address || "").toLowerCase())) hasIn = true;
      }
      if (hasOut && hasIn) onChainSwapHashes.add(txHash);
    }

    // ── Process ──
    const result: Array<{
      tx_hash: string; direction: string; token_symbol: string;
      token_address: string; amount: number; counterparty_address: string; created_at: string;
    }> = [];

    for (const t of allTransfers) {
      const txHash = (t.transaction_hash || "").toLowerCase();
      if (!txHash || donationHashes.has(txHash) || swapHashes.has(txHash) || onChainSwapHashes.has(txHash)) continue;

      const tokenAddr = (t.address || "").toLowerCase();
      const tokenInfo = KNOWN_TOKENS[tokenAddr];
      if (!tokenInfo) continue;

      const from = (t.from_address || "").toLowerCase();
      const to = (t.to_address || "").toLowerCase();
      let direction: string, counterparty: string;

      if (walletSet.has(from) && !walletSet.has(to)) { direction = "out"; counterparty = to; }
      else if (walletSet.has(to) && !walletSet.has(from)) { direction = "in"; counterparty = from; }
      else continue;

      const symbol = tokenInfo.symbol === "WBNB" ? "BNB" : tokenInfo.symbol;
      const key = `${txHash}_${direction}_${symbol}`;
      if (existingKeys.has(key)) continue;

      result.push({
        tx_hash: txHash, direction, token_symbol: symbol, token_address: tokenAddr,
        amount: Number(BigInt(t.value || "0")) / Math.pow(10, tokenInfo.decimals),
        counterparty_address: counterparty,
        created_at: t.block_timestamp || new Date().toISOString(),
      });
    }

    console.log(`${result.length} new transfers (excl ${donationHashes.size} donations, ${swapHashes.size + onChainSwapHashes.size} swaps)`);

    if (result.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No new wallet transfers found",
        total_erc20: allTransfers.length, inserted: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toInsert = result.map((t) => ({
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
      if (error) { errors.push(error.message); } else { inserted += batch.length; }
    }

    console.log(`Done: ${inserted} inserted`);
    return new Response(JSON.stringify({
      success: true, user_id: userId, wallets: walletAddresses,
      total_erc20: allTransfers.length, transfers_found: result.length, inserted,
      errors: errors.length > 0 ? errors : undefined,
      transfers: result.map((t) => ({
        tx_hash: t.tx_hash, direction: t.direction,
        detail: `${t.amount} ${t.token_symbol} ${t.direction === 'in' ? '← ' : '→ '}${t.counterparty_address.slice(0, 10)}...`,
        date: t.created_at,
      })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("backfill-wallet-transfers error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
