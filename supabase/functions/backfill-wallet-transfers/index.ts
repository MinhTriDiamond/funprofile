import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

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

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisKey = Deno.env.get("MORALIS_API_KEY");
    if (!moralisKey) {
      return new Response(JSON.stringify({ error: "MORALIS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();
    const body = await req.json();
    const { user_id, wallet_address, chain = "0x38", chain_id = 56 } = body;

    // Resolve wallet address
    let walletAddr = wallet_address?.toLowerCase().trim();
    let userId = user_id;

    if (!walletAddr && !userId) {
      return new Response(JSON.stringify({ error: "user_id or wallet_address required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!walletAddr && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, public_wallet_address, wallet_address")
        .eq("id", userId)
        .single();
      if (!profile) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      walletAddr = (profile.public_wallet_address || profile.wallet_address || "").toLowerCase().trim();
      if (!walletAddr) {
        // Fallback: check TREASURY_WALLET_ADDRESS env for treasury profiles
        const treasuryAddr = Deno.env.get("TREASURY_WALLET_ADDRESS")?.toLowerCase().trim();
        if (treasuryAddr) {
          walletAddr = treasuryAddr;
          console.log(`Using TREASURY_WALLET_ADDRESS fallback for user ${userId}`);
        } else {
          return new Response(JSON.stringify({ error: "User has no wallet address" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!userId && walletAddr) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, public_wallet_address, wallet_address, external_wallet_address");
      const match = profiles?.find((p: any) =>
        [p.public_wallet_address, p.wallet_address, p.external_wallet_address]
          .some((a: string | null) => a?.toLowerCase() === walletAddr)
      );
      if (!match) {
        return new Response(JSON.stringify({ error: "No user found for this wallet" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = match.id;
    }

    console.log(`Backfilling wallet transfers for user ${userId}, wallet ${walletAddr}, walletLength=${walletAddr?.length}`);

    // Fetch all ERC20 transfers from Moralis
    const allTransfers: TokenTransfer[] = [];
    let cursor: string | null = null;
    let page = 0;
    const MAX_PAGES = 20;

    do {
      const params = new URLSearchParams({ chain, limit: "100" });
      if (cursor) params.set("cursor", cursor);

      const url = `${MORALIS_BASE}/${walletAddr}/erc20/transfers?${params.toString()}`;
      console.log(`Fetching page ${page}: ${url}`);

      const res = await fetch(url, {
        headers: { "X-API-Key": moralisKey, Accept: "application/json" },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Moralis error ${res.status}: ${errText}`);
        break;
      }

      const data = await res.json();
      allTransfers.push(...(data.result || []));
      cursor = data.cursor || null;
      page++;
    } while (cursor && page < MAX_PAGES);

    console.log(`Fetched ${allTransfers.length} total ERC20 transfers`);

    // Get existing tx_hashes from donations and swap_transactions to exclude
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

    // Group by tx_hash to detect swaps (exclude them)
    const txGroups = new Map<string, TokenTransfer[]>();
    for (const t of allTransfers) {
      const hash = (t.transaction_hash || "").toLowerCase();
      if (!hash) continue;
      if (!txGroups.has(hash)) txGroups.set(hash, []);
      txGroups.get(hash)!.push(t);
    }

    // Identify swap tx_hashes (has both in and out for known tokens)
    const onChainSwapHashes = new Set<string>();
    for (const [txHash, transfers] of txGroups) {
      let hasOut = false, hasIn = false;
      for (const t of transfers) {
        const tokenAddr = (t.address || "").toLowerCase();
        if (!KNOWN_TOKENS[tokenAddr]) continue;
        if ((t.from_address || "").toLowerCase() === walletAddr) hasOut = true;
        if ((t.to_address || "").toLowerCase() === walletAddr) hasIn = true;
      }
      if (hasOut && hasIn) onChainSwapHashes.add(txHash);
    }

    // Process single-direction transfers (not swaps, not donations)
    const transfers: Array<{
      tx_hash: string;
      direction: string;
      token_symbol: string;
      token_address: string;
      amount: number;
      counterparty_address: string;
      created_at: string;
    }> = [];

    for (const t of allTransfers) {
      const txHash = (t.transaction_hash || "").toLowerCase();
      if (!txHash) continue;

      // Skip if already in donations, swaps, or on-chain swap
      if (donationHashes.has(txHash)) continue;
      if (swapHashes.has(txHash)) continue;
      if (onChainSwapHashes.has(txHash)) continue;

      const tokenAddr = (t.address || "").toLowerCase();
      const tokenInfo = KNOWN_TOKENS[tokenAddr];
      if (!tokenInfo) continue;

      const from = (t.from_address || "").toLowerCase();
      const to = (t.to_address || "").toLowerCase();

      let direction: string;
      let counterparty: string;

      if (from === walletAddr && to !== walletAddr) {
        direction = "out";
        counterparty = to;
      } else if (to === walletAddr && from !== walletAddr) {
        direction = "in";
        counterparty = from;
      } else {
        continue;
      }

      const symbol = tokenInfo.symbol === "WBNB" ? "BNB" : tokenInfo.symbol;
      const key = `${txHash}_${direction}_${symbol}`;
      if (existingTransferKeys.has(key)) continue;

      const amount = Number(BigInt(t.value || "0")) / Math.pow(10, tokenInfo.decimals);

      transfers.push({
        tx_hash: txHash,
        direction,
        token_symbol: symbol,
        token_address: tokenAddr,
        amount,
        counterparty_address: counterparty,
        created_at: t.block_timestamp || new Date().toISOString(),
      });
    }

    console.log(`Found ${transfers.length} direct wallet transfers (excluded ${donationHashes.size} donations, ${swapHashes.size} DB swaps, ${onChainSwapHashes.size} on-chain swaps)`);

    if (transfers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No new wallet transfers found",
        total_erc20: allTransfers.length,
        excluded_donations: donationHashes.size,
        excluded_swaps: swapHashes.size + onChainSwapHashes.size,
        inserted: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in batches
    const toInsert = transfers.map((t) => ({
      user_id: userId,
      tx_hash: t.tx_hash,
      direction: t.direction,
      token_symbol: t.token_symbol,
      token_address: t.token_address,
      amount: t.amount,
      counterparty_address: t.counterparty_address,
      chain_id: chain_id,
      status: "confirmed",
      created_at: t.created_at,
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
      success: true,
      user_id: userId,
      wallet: walletAddr,
      total_erc20: allTransfers.length,
      excluded_donations: donationHashes.size,
      excluded_swaps: swapHashes.size + onChainSwapHashes.size,
      transfers_found: transfers.length,
      inserted,
      errors: errors.length > 0 ? errors : undefined,
      transfers: transfers.map((t) => ({
        tx_hash: t.tx_hash,
        direction: t.direction,
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
