import { corsHeaders, handleCors } from "../_shared/cors.ts";

const BSCSCAN_MAINNET = "https://api.bscscan.com/api";
const BSCSCAN_TESTNET = "https://api-testnet.bscscan.com/api";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { address, page = 1, offset = 20, sort = "desc", action = "txlist", network = "both" } = await req.json();

    if (!address || typeof address !== "string") {
      return new Response(JSON.stringify({ error: "address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("BSCSCAN_API_KEY") || "";
    const params = new URLSearchParams({
      module: "account",
      action,
      address,
      page: String(page),
      offset: String(offset),
      sort,
      startblock: "0",
      endblock: "99999999",
    });
    if (apiKey) params.set("apikey", apiKey);

    const fetchFromApi = async (baseUrl: string) => {
      try {
        const res = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await res.json();
        if (data.status === "1" && Array.isArray(data.result)) {
          return data.result;
        }
        return [];
      } catch {
        return [];
      }
    };

    let results: any[] = [];

    if (network === "mainnet" || network === "both") {
      const mainnet = await fetchFromApi(BSCSCAN_MAINNET);
      results.push(...mainnet.map((tx: any) => ({ ...tx, _network: "mainnet", _chainId: 56 })));
    }

    if (network === "testnet" || network === "both") {
      const testnet = await fetchFromApi(BSCSCAN_TESTNET);
      results.push(...testnet.map((tx: any) => ({ ...tx, _network: "testnet", _chainId: 97 })));
    }

    // Sort by timestamp descending
    results.sort((a, b) => Number(b.timeStamp) - Number(a.timeStamp));

    // Paginate combined results if fetching both networks
    if (network === "both") {
      const start = 0;
      const end = offset;
      results = results.slice(start, end);
    }

    return new Response(JSON.stringify({ result: results, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
