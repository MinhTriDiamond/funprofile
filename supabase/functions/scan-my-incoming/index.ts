import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Known tokens on BSC Mainnet (lowercase)
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
};

// FUN token on BSC Testnet
const FUN_TOKEN_ADDRESS = "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6";

// Minimum amounts to filter spam/dust attacks
const MIN_AMOUNTS: Record<string, number> = {
  USDT: 0.01,
  BTCB: 0.01,
  CAMLY: 1,
  FUN: 1,
};

interface MoralisTransfer {
  transaction_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  token_decimals: string;
  token_symbol: string;
  token_name: string;
  address: string;
  block_timestamp: string;
  block_number: string;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisApiKey = Deno.env.get("MORALIS_API_KEY");
    if (!moralisApiKey) {
      return new Response(JSON.stringify({ error: "MORALIS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const adminClient = createAdminClient();

    // Get user's public_wallet_address
    const { data: profile } = await adminClient
      .from("profiles")
      .select("public_wallet_address")
      .eq("id", userId)
      .single();

    if (!profile?.public_wallet_address) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "Bạn chưa thiết lập ví công khai" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const myWallet = profile.public_wallet_address.toLowerCase();

    // Get all Fun Profile wallet addresses to map sender_id
    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, username, display_name")
      .not("public_wallet_address", "is", null);

    const walletToProfile = new Map<string, { id: string; username: string; display_name: string | null }>();
    for (const p of allProfiles || []) {
      if (p.public_wallet_address) {
        walletToProfile.set(p.public_wallet_address.toLowerCase(), {
          id: p.id,
          username: p.username,
          display_name: p.display_name,
        });
      }
    }

    // Fetch ERC20 transfers TO user's wallet
    const moralisHeaders = { "X-API-Key": moralisApiKey, Accept: "application/json" };
    const moralisBase = "https://deep-index.moralis.io/api/v2.2";

    const [mainnetRes, testnetRes] = await Promise.all([
      fetch(`${moralisBase}/${myWallet}/erc20/transfers?chain=bsc&limit=100&order=DESC`, { headers: moralisHeaders }),
      fetch(`${moralisBase}/${myWallet}/erc20/transfers?chain=bsc+testnet&limit=100&order=DESC`, { headers: moralisHeaders }),
    ]);

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

    let testnetTransfers: MoralisTransfer[] = [];
    if (testnetRes.ok) {
      const testnetData = await testnetRes.json();
      testnetTransfers = testnetData.result || [];
    }

    // Filter: only INCOMING to my wallet, known tokens
    const incomingAll = [...mainnetTransfers, ...testnetTransfers].filter((t) => {
      const to = t.to_address?.toLowerCase();
      if (to !== myWallet) return false;
      const contract = t.address?.toLowerCase() || "";
      return !!KNOWN_TOKENS[contract] || contract === FUN_TOKEN_ADDRESS;
    });

    if (incomingAll.length === 0) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "Không tìm thấy giao dịch mới" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing tx_hashes
    const txHashes = incomingAll.map((t) => t.transaction_hash).filter(Boolean);
    const { data: existingDonations } = await adminClient
      .from("donations")
      .select("tx_hash")
      .in("tx_hash", txHashes);

    const existingSet = new Set((existingDonations || []).map((d) => d.tx_hash));
    const newTransfers = incomingAll.filter(
      (t) => t.transaction_hash && !existingSet.has(t.transaction_hash)
    );

    if (newTransfers.length === 0) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "Tất cả giao dịch đã được ghi nhận" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build donation records
    const donationsToInsert: Record<string, unknown>[] = [];

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

      const rawValue = BigInt(transfer.value || "0");
      const divisor = BigInt(10 ** tokenDecimals);
      const intPart = rawValue / divisor;
      const fracPart = rawValue % divisor;
      const amount =
        `${intPart}.${fracPart.toString().padStart(tokenDecimals, "0")}`.replace(/\.?0+$/, "") || "0";

      const senderAddr = transfer.from_address.toLowerCase();
      const senderProfile = walletToProfile.get(senderAddr);
      const isInternal = !!senderProfile;

      donationsToInsert.push({
        sender_id: senderProfile?.id || null,
        sender_address: senderAddr,
        recipient_id: userId,
        amount,
        token_symbol: tokenSymbol,
        token_address: contractAddr,
        chain_id: isFun ? 97 : 56,
        tx_hash: transfer.transaction_hash,
        status: "confirmed",
        confirmed_at: transfer.block_timestamp,
        created_at: transfer.block_timestamp,
        is_external: !isInternal,
        card_theme: "celebration",
        card_sound: "rich-1",
        message: null,
        light_score_earned: 0,
        metadata: {
          sender_name: senderProfile?.display_name || senderProfile?.username || "Ví ngoài",
        },
      });
    }

    if (donationsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ newTransfers: 0, message: "Không có giao dịch token đã biết" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await adminClient
      .from("donations")
      .insert(donationsToInsert);

    if (insertError) {
      console.error("Insert donations error:", insertError);
      throw new Error(`Failed to insert donations: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        newTransfers: donationsToInsert.length,
        message: `Tìm thấy ${donationsToInsert.length} giao dịch mới`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("scan-my-incoming error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
