import { corsHeaders, handleCors } from "../_shared/cors.ts";

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { address, page = 1, offset = 20, action = "txlist", network = "both" } = await req.json();

    if (!address || typeof address !== "string") {
      return new Response(JSON.stringify({ error: "address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("MORALIS_API_KEY") || "";
    if (!apiKey) {
      console.error("MORALIS_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isTokenTx = action === "tokentx";

    const fetchFromMoralis = async (chain: string, chainId: number) => {
      try {
        const endpoint = isTokenTx
          ? `${MORALIS_BASE}/${address}/erc20/transfers`
          : `${MORALIS_BASE}/${address}`;

        const params = new URLSearchParams({
          chain,
          limit: String(offset),
          offset: String((page - 1) * offset),
        });

        console.log(`Fetching ${chain}: ${endpoint}?${params.toString()}`);

        const res = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            "X-API-Key": apiKey,
            "Accept": "application/json",
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Moralis ${chain} error ${res.status}: ${errText}`);
          return [];
        }

        const data = await res.json();
        const items = data.result || [];

        return items.map((tx: any) => ({
          hash: tx.hash || tx.transaction_hash || "",
          timeStamp: tx.block_timestamp || "",
          from: tx.from_address || "",
          to: tx.to_address || "",
          value: tx.value || "0",
          gasUsed: tx.receipt_gas_used || tx.gas_used || "0",
          gasPrice: tx.gas_price || "0",
          isError: tx.receipt_status === "0" ? "1" : "0",
          txreceipt_status: tx.receipt_status || "1",
          functionName: tx.method_label || "",
          tokenSymbol: tx.token_symbol || undefined,
          tokenDecimal: tx.token_decimals?.toString() || undefined,
          tokenName: tx.token_name || undefined,
          _network: chainId === 56 ? "mainnet" : "testnet",
          _chainId: chainId,
          _isIsoTimestamp: true,
        }));
      } catch (err) {
        console.error(`Moralis ${chain} fetch error:`, err);
        return [];
      }
    };

    let results: any[] = [];

    if (network === "mainnet" || network === "both") {
      const mainnet = await fetchFromMoralis("0x38", 56);
      results.push(...mainnet);
    }

    if (network === "testnet" || network === "both") {
      const testnet = await fetchFromMoralis("0x61", 97);
      results.push(...testnet);
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime());

    // Paginate combined results if fetching both networks
    if (network === "both") {
      results = results.slice(0, offset);
    }

    console.log(`Returning ${results.length} transactions for ${address}`);

    return new Response(JSON.stringify({ result: results, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-wallet-history error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
