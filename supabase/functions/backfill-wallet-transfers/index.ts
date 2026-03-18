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

// ── BSC RPC ──

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function batchRpcCall(calls: Array<{ method: string; params: unknown[] }>): Promise<any[]> {
  const batch = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch),
  });
  const results = await res.json();
  if (!Array.isArray(results)) return calls.map(() => null);
  results.sort((a: any, b: any) => a.id - b.id);
  return results.map((r: any) => r.result ?? null);
}

async function fetchTransfersViaBscRpc(walletAddr: string, fromBlock: number, tokenFilter?: string[]): Promise<TokenTransfer[]> {
  const paddedAddr = "0x" + walletAddr.slice(2).padStart(64, "0");
  const latestHex = await rpcCall("eth_blockNumber", []);
  const latestBlock = parseInt(latestHex, 16);
  const fromHex = "0x" + fromBlock.toString(16);
  const toHex = "0x" + latestBlock.toString(16);

  console.log(`BSC RPC: blocks ${fromBlock}-${latestBlock} for ${walletAddr.slice(0, 10)}...`);

  const tokens = Object.entries(KNOWN_TOKENS).filter(([addr]) =>
    !tokenFilter || tokenFilter.length === 0 || tokenFilter.includes(addr)
  );

  // Fire all getLogs in parallel (2 per token: in + out)
  const logCalls = tokens.flatMap(([tokenAddr]) => [
    { method: "eth_getLogs", params: [{ fromBlock: fromHex, toBlock: toHex, address: tokenAddr, topics: [TRANSFER_TOPIC, null, paddedAddr] }] },
    { method: "eth_getLogs", params: [{ fromBlock: fromHex, toBlock: toHex, address: tokenAddr, topics: [TRANSFER_TOPIC, paddedAddr, null] }] },
  ]);

  const logResults = await batchRpcCall(logCalls);

  const allTransfers: TokenTransfer[] = [];
  const blockNumbers = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const [tokenAddr, tokenInfo] = tokens[i];
    const logsIn = logResults[i * 2] || [];
    const logsOut = logResults[i * 2 + 1] || [];
    const allLogs = [...logsIn, ...logsOut];
    console.log(`  ${tokenInfo.symbol}: ${allLogs.length} logs`);

    for (const log of allLogs) {
      blockNumbers.add(log.blockNumber);
      allTransfers.push({
        transaction_hash: log.transactionHash,
        from_address: "0x" + (log.topics[1] as string).slice(26).toLowerCase(),
        to_address: "0x" + (log.topics[2] as string).slice(26).toLowerCase(),
        value: BigInt(log.data).toString(),
        address: tokenAddr,
        block_timestamp: log.blockNumber, // placeholder, will resolve below
      });
    }
  }

  // Batch fetch block timestamps
  if (blockNumbers.size > 0) {
    const uniqueBlocks = Array.from(blockNumbers);
    const blockCalls = uniqueBlocks.map((bn) => ({ method: "eth_getBlockByNumber", params: [bn, false] }));
    // Batch in groups of 20
    const tsMap = new Map<string, string>();
    for (let i = 0; i < blockCalls.length; i += 20) {
      const chunk = blockCalls.slice(i, i + 20);
      const results = await batchRpcCall(chunk);
      for (let j = 0; j < chunk.length; j++) {
        const bn = uniqueBlocks[i + j];
        const ts = results[j]?.timestamp
          ? new Date(parseInt(results[j].timestamp, 16) * 1000).toISOString()
          : new Date().toISOString();
        tsMap.set(bn, ts);
      }
    }
    // Replace block_timestamp placeholders
    for (const t of allTransfers) {
      t.block_timestamp = tsMap.get(t.block_timestamp) || new Date().toISOString();
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

// ── Moralis ──

async function fetchTransfersViaMoralis(walletAddr: string, chain: string, moralisKey: string): Promise<TokenTransfer[] | null> {
  const all: TokenTransfer[] = [];
  let cursor: string | null = null;
  let page = 0;
  do {
    const params = new URLSearchParams({ chain, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${MORALIS_BASE}/${walletAddr}/erc20/transfers?${params}`, {
      headers: { "X-API-Key": moralisKey, Accept: "application/json" },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 429) return null;
      break;
    }
    const data = await res.json();
    all.push(...(data.result || []));
    cursor = data.cursor || null;
    page++;
  } while (cursor && page < 20);
  return all;
}

// ── Main ──

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisKey = Deno.env.get("MORALIS_API_KEY");
    const supabase = createAdminClient();
    const body = await req.json();
    const { user_id, wallet_address, chain = "0x38", chain_id = 56, from_block, tokens } = body;
    let userId = user_id;

    // Default: scan last ~2M blocks (~70 days)
    const scanFrom = from_block ? Number(from_block) : 50_000_000;

    let walletAddresses: string[] = [];
    if (wallet_address) walletAddresses = [wallet_address.toLowerCase().trim()];

    if (!walletAddresses.length && !userId) {
      return new Response(JSON.stringify({ error: "user_id or wallet_address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId && !walletAddresses.length) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, public_wallet_address, wallet_address, external_wallet_address")
        .eq("id", userId).single();
      if (!profile) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const addrs = new Set<string>();
      for (const f of ["public_wallet_address", "wallet_address", "external_wallet_address"]) {
        const v = (profile as any)[f]?.toLowerCase().trim();
        if (v && v.startsWith("0x") && v.length === 42) addrs.add(v);
      }
      if (addrs.size === 0) {
        const ta = Deno.env.get("TREASURY_WALLET_ADDRESS")?.toLowerCase().trim();
        if (ta) addrs.add(ta);
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
        .from("profiles").select("id, public_wallet_address, wallet_address, external_wallet_address");
      const wa = walletAddresses[0];
      const match = profiles?.find((p: any) =>
        [p.public_wallet_address, p.wallet_address, p.external_wallet_address]
          .some((a: string | null) => a?.toLowerCase().trim() === wa)
      );
      if (!match) {
        return new Response(JSON.stringify({ error: "No user found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = match.id;
    }

    console.log(`Backfill user ${userId}, wallets: ${walletAddresses.join(", ")}, from_block: ${scanFrom}`);

    const allTransfers: TokenTransfer[] = [];
    for (const wa of walletAddresses) {
      let transfers: TokenTransfer[] | null = null;
      if (moralisKey) transfers = await fetchTransfersViaMoralis(wa, chain, moralisKey);
      if (transfers === null) {
        transfers = await fetchTransfersViaBscRpc(wa, scanFrom, tokens);
      }
      allTransfers.push(...transfers);
    }

    console.log(`Total: ${allTransfers.length} transfers`);

    // Exclude existing
    const { data: donTxs } = await supabase.from("donations").select("tx_hash")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    const { data: swpTxs } = await supabase.from("swap_transactions").select("tx_hash").eq("user_id", userId);
    const { data: exTxs } = await supabase.from("wallet_transfers").select("tx_hash, direction, token_symbol").eq("user_id", userId);

    const donH = new Set((donTxs || []).map((d: any) => d.tx_hash?.toLowerCase()));
    const swpH = new Set((swpTxs || []).map((s: any) => s.tx_hash?.toLowerCase()));
    const exKeys = new Set((exTxs || []).map((t: any) => `${t.tx_hash?.toLowerCase()}_${t.direction}_${t.token_symbol}`));

    const walletSet = new Set(walletAddresses);
    const txGroups = new Map<string, TokenTransfer[]>();
    for (const t of allTransfers) {
      const h = (t.transaction_hash || "").toLowerCase();
      if (!h) continue;
      if (!txGroups.has(h)) txGroups.set(h, []);
      txGroups.get(h)!.push(t);
    }
    const swapOnChain = new Set<string>();
    for (const [h, txs] of txGroups) {
      let o = false, i = false;
      for (const t of txs) {
        if (!KNOWN_TOKENS[(t.address || "").toLowerCase()]) continue;
        if (walletSet.has((t.from_address || "").toLowerCase())) o = true;
        if (walletSet.has((t.to_address || "").toLowerCase())) i = true;
      }
      if (o && i) swapOnChain.add(h);
    }

    const result: any[] = [];
    for (const t of allTransfers) {
      const txH = (t.transaction_hash || "").toLowerCase();
      if (!txH || donH.has(txH) || swpH.has(txH) || swapOnChain.has(txH)) continue;
      const tAddr = (t.address || "").toLowerCase();
      const ti = KNOWN_TOKENS[tAddr];
      if (!ti) continue;
      const from = (t.from_address || "").toLowerCase();
      const to = (t.to_address || "").toLowerCase();
      let dir: string, cp: string;
      if (walletSet.has(from) && !walletSet.has(to)) { dir = "out"; cp = to; }
      else if (walletSet.has(to) && !walletSet.has(from)) { dir = "in"; cp = from; }
      else continue;
      const sym = ti.symbol === "WBNB" ? "BNB" : ti.symbol;
      if (exKeys.has(`${txH}_${dir}_${sym}`)) continue;
      result.push({
        tx_hash: txH, direction: dir, token_symbol: sym, token_address: tAddr,
        amount: Number(BigInt(t.value || "0")) / Math.pow(10, ti.decimals),
        counterparty_address: cp, created_at: t.block_timestamp || new Date().toISOString(),
      });
    }

    console.log(`${result.length} new transfers`);

    if (result.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No new transfers", total_erc20: allTransfers.length, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toInsert = result.map((t: any) => ({
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
      if (error) errors.push(error.message); else inserted += batch.length;
    }

    console.log(`Done: ${inserted} inserted`);
    return new Response(JSON.stringify({
      success: true, user_id: userId, wallets: walletAddresses,
      total_erc20: allTransfers.length, transfers_found: result.length, inserted,
      errors: errors.length > 0 ? errors : undefined,
      transfers: result.map((t: any) => ({
        tx_hash: t.tx_hash, direction: t.direction,
        detail: `${t.amount} ${t.token_symbol} ${t.direction === 'in' ? '← ' : '→ '}${t.counterparty_address.slice(0, 10)}...`,
      })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("backfill error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
