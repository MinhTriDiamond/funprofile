import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Token contract addresses on BSC Mainnet (lowercase)
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
};

// FUN token on BSC Testnet
const FUN_TOKEN_ADDRESS = "0x1aa8de8b1e4465c6d729e8564893f8ef823a5ff2";

interface MoralisTransfer {
  transaction_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  token_decimals: string;
  token_symbol: string;
  token_name: string;
  address: string; // contract address
  block_timestamp: string;
  block_number: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const moralisApiKey = Deno.env.get("MORALIS_API_KEY");

    if (!moralisApiKey) {
      return new Response(JSON.stringify({ error: "MORALIS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getUser(token);
    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.user.id;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's public wallet address
    const { data: profile } = await adminClient
      .from("profiles")
      .select("public_wallet_address")
      .eq("id", userId)
      .single();

    const walletAddress = profile?.public_wallet_address;
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "No wallet address configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ERC20 token transfers from Moralis (BSC Mainnet)
    const moralisBaseUrl = "https://deep-index.moralis.io/api/v2.2";
    const headers = { "X-API-Key": moralisApiKey, "Accept": "application/json" };

    // Fetch BSC mainnet transfers (USDT, BTCB, CAMLY)
    const mainnetUrl = `${moralisBaseUrl}/${walletAddress}/erc20/transfers?chain=bsc&limit=100&order=DESC`;
    const mainnetRes = await fetch(mainnetUrl, { headers });

    if (!mainnetRes.ok) {
      const errText = await mainnetRes.text();
      console.error("Moralis mainnet error:", mainnetRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Moralis API error: ${mainnetRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mainnetData = await mainnetRes.json();
    const mainnetTransfers: MoralisTransfer[] = mainnetData.result || [];

    // Fetch BSC testnet transfers (FUN token)
    const testnetUrl = `${moralisBaseUrl}/${walletAddress}/erc20/transfers?chain=bsc+testnet&limit=100&order=DESC`;
    const testnetRes = await fetch(testnetUrl, { headers });
    
    let testnetTransfers: MoralisTransfer[] = [];
    if (testnetRes.ok) {
      const testnetData = await testnetRes.json();
      testnetTransfers = testnetData.result || [];
    } else {
      console.warn("Moralis testnet fetch failed:", testnetRes.status);
    }

    // Combine and filter: only incoming transfers to this wallet
    const walletLower = walletAddress.toLowerCase();
    const allTransfers = [...mainnetTransfers, ...testnetTransfers].filter(
      (t) => t.to_address?.toLowerCase() === walletLower
    );

    if (allTransfers.length === 0) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "No incoming transfers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing tx_hashes to avoid duplicates
    const txHashes = allTransfers.map((t) => t.transaction_hash).filter(Boolean);
    const { data: existingDonations } = await adminClient
      .from("donations")
      .select("tx_hash")
      .in("tx_hash", txHashes);

    const existingSet = new Set((existingDonations || []).map((d) => d.tx_hash));

    // Filter new transfers
    const newTransfers = allTransfers.filter(
      (t) => t.transaction_hash && !existingSet.has(t.transaction_hash)
    );

    if (newTransfers.length === 0) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "All transfers already recorded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all profiles to map sender addresses
    const senderAddresses = [...new Set(newTransfers.map((t) => t.from_address.toLowerCase()))];
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, username, public_wallet_address, custodial_wallet_address");

    const walletToProfile = new Map<string, string>();
    for (const p of profiles || []) {
      if (p.public_wallet_address) {
        walletToProfile.set(p.public_wallet_address.toLowerCase(), p.id);
      }
      if (p.custodial_wallet_address) {
        walletToProfile.set(p.custodial_wallet_address.toLowerCase(), p.id);
      }
    }

    // Build donation records
    const donationsToInsert: any[] = [];
    const notificationsToInsert: any[] = [];

    for (const transfer of newTransfers) {
      const contractAddr = transfer.address?.toLowerCase() || "";
      const tokenInfo = KNOWN_TOKENS[contractAddr];
      const isFun = contractAddr === FUN_TOKEN_ADDRESS;
      
      let tokenSymbol = transfer.token_symbol || "UNKNOWN";
      let tokenDecimals = parseInt(transfer.token_decimals) || 18;

      if (tokenInfo) {
        tokenSymbol = tokenInfo.symbol;
        tokenDecimals = tokenInfo.decimals;
      } else if (isFun) {
        tokenSymbol = "FUN";
        tokenDecimals = 18;
      }

      // Only process known tokens
      if (!tokenInfo && !isFun) {
        continue;
      }

      const rawValue = BigInt(transfer.value || "0");
      const divisor = BigInt(10 ** tokenDecimals);
      const intPart = rawValue / divisor;
      const fracPart = rawValue % divisor;
      const amount = `${intPart}.${fracPart.toString().padStart(tokenDecimals, "0")}`.replace(/\.?0+$/, "") || "0";

      const senderAddress = transfer.from_address.toLowerCase();
      const senderId = walletToProfile.get(senderAddress) || null;

      donationsToInsert.push({
        sender_id: senderId,
        sender_address: senderAddress,
        recipient_id: userId,
        amount,
        token_symbol: tokenSymbol,
        token_address: contractAddr,
        chain_id: isFun ? 97 : 56,
        tx_hash: transfer.transaction_hash,
        status: "confirmed",
        confirmed_at: transfer.block_timestamp,
        is_external: !senderId,
        card_theme: "celebration",
        card_sound: "rich-1",
        message: null,
        light_score_earned: 0,
      });

      notificationsToInsert.push({
        user_id: userId,
        actor_id: senderId || userId, // fallback to self if no sender profile
        type: "donation_received",
      });
    }

    if (donationsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "No known token transfers to record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert donations
    const { error: insertError } = await adminClient
      .from("donations")
      .insert(donationsToInsert);

    if (insertError) {
      console.error("Insert donations error:", insertError);
      throw new Error(`Failed to insert donations: ${insertError.message}`);
    }

    // Insert notifications (best effort)
    if (notificationsToInsert.length > 0) {
      await adminClient.from("notifications").insert(notificationsToInsert).throwOnError().catch((e) => {
        console.warn("Notification insert failed:", e);
      });
    }

    return new Response(
      JSON.stringify({
        newTransfers: donationsToInsert.length,
        message: `Detected ${donationsToInsert.length} new incoming transfer(s)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("detect-incoming-transfers error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
