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

    // Get all Fun Profile wallet addresses to map sender_id (all 3 wallet fields)
    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, wallet_address, external_wallet_address, username, display_name")
      .not("public_wallet_address", "is", null);

    const walletToProfile = new Map<string, { id: string; username: string; display_name: string | null }>();
    for (const p of allProfiles || []) {
      if (p.public_wallet_address) {
        const profileData = { id: p.id, username: p.username, display_name: p.display_name };
        for (const raw of [p.public_wallet_address, p.wallet_address, p.external_wallet_address]) {
          if (raw) {
            const addr = raw.toLowerCase();
            if (!walletToProfile.has(addr)) walletToProfile.set(addr, profileData);
          }
        }
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

      const numAmount = parseFloat(amount);

      // Skip zero-amount and dust/spam transactions
      const minAmount = MIN_AMOUNTS[tokenSymbol] ?? 0.01;
      if (numAmount <= 0 || numAmount < minAmount) continue;

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

    const { data: insertedDonations, error: insertError } = await adminClient
      .from("donations")
      .insert(donationsToInsert)
      .select("id, tx_hash, sender_id, recipient_id, sender_address, amount, token_symbol");

    if (insertError) {
      console.error("Insert donations error:", insertError);
      throw new Error(`Failed to insert donations: ${insertError.message}`);
    }

    // === Tạo gift_celebration posts ===
    const postsToInsert: Record<string, unknown>[] = [];
    for (const d of donationsToInsert) {
      const senderProfile = d.sender_id ? walletToProfile.get((d.sender_address as string) || "") : null;
      const senderName = senderProfile?.display_name || senderProfile?.username || "Ví ngoài";

      // Get recipient name
      const recipientProfile = walletToProfile.get(myWallet);
      const recipientName = recipientProfile?.display_name || recipientProfile?.username || "Unknown";

      postsToInsert.push({
        user_id: (d.sender_id as string) || userId,
        content: `${senderName} đã tặng ${d.amount} ${d.token_symbol} cho ${recipientName}`,
        post_type: "gift_celebration",
        tx_hash: d.tx_hash,
        gift_sender_id: d.sender_id || null,
        gift_recipient_id: userId,
        gift_token: d.token_symbol,
        gift_amount: String(d.amount),
        gift_message: null,
        is_highlighted: true,
        highlight_expires_at: null,
        visibility: "public",
        moderation_status: "approved",
        created_at: d.created_at,
      });
    }

    // Check existing posts to avoid duplicates
    const postTxHashes = postsToInsert.map(p => p.tx_hash as string).filter(Boolean);
    const { data: existingPosts } = await adminClient
      .from("posts")
      .select("tx_hash")
      .eq("post_type", "gift_celebration")
      .in("tx_hash", postTxHashes);

    const existingPostSet = new Set((existingPosts || []).map(p => p.tx_hash));
    const newPosts = postsToInsert.filter(p => !existingPostSet.has(p.tx_hash as string));

    const insertedPostsByTx = new Map<string, string>();
    if (newPosts.length > 0) {
      const { data: inserted, error: postErr } = await adminClient
        .from("posts")
        .insert(newPosts)
        .select("id, tx_hash");
      if (postErr) console.error("Post insert error:", postErr);
      else {
        for (const p of inserted || []) {
          insertedPostsByTx.set(p.tx_hash, p.id);
        }
        console.log(`Created ${newPosts.length} gift_celebration posts`);
      }
    }

    // === Tạo notifications ===
    const notificationsToInsert = donationsToInsert
      .filter(d => !existingPostSet.has(d.tx_hash as string))
      .map(d => ({
        user_id: userId,
        actor_id: (d.sender_id as string) || userId,
        post_id: insertedPostsByTx.get(d.tx_hash as string) || null,
        type: "donation",
        read: false,
      }));

    if (notificationsToInsert.length > 0) {
      const { error: notifErr } = await adminClient.from("notifications").insert(notificationsToInsert);
      if (notifErr) console.error("Notification insert error:", notifErr);
      else console.log(`Created ${notificationsToInsert.length} notifications`);
    }

    // === Chat messages cho internal donations ===
    for (const d of donationsToInsert) {
      if (existingPostSet.has(d.tx_hash as string)) continue;
      const senderId = d.sender_id as string;
      if (!senderId || senderId === userId) continue;

      try {
        const senderProf = walletToProfile.get((d.sender_address as string) || "");
        const senderName = senderProf?.display_name || senderProf?.username || "Unknown";
        const txHashShort = (d.tx_hash as string).substring(0, 10) + "...";

        const { data: existingConvs } = await adminClient
          .from("conversations")
          .select("id, conversation_participants!inner(user_id)")
          .eq("type", "direct");

        let conversationId: string | null = null;
        if (existingConvs) {
          for (const conv of existingConvs) {
            const parts = (conv.conversation_participants as { user_id: string }[]).map(p => p.user_id);
            if (parts.length === 2 && parts.includes(senderId) && parts.includes(userId)) {
              conversationId = conv.id;
              break;
            }
          }
        }

        if (!conversationId) {
          const { data: newConv } = await adminClient
            .from("conversations")
            .insert({ type: "direct", created_by: senderId })
            .select("id")
            .single();
          if (newConv) {
            conversationId = newConv.id;
            await adminClient.from("conversation_participants").insert([
              { conversation_id: conversationId, user_id: senderId, role: "member" },
              { conversation_id: conversationId, user_id: userId, role: "member" },
            ]);
          }
        }

        if (conversationId) {
          const msgContent = `🎁 ${senderName} đã tặng bạn ${d.amount} ${d.token_symbol}!\n💰 TX: ${txHashShort}`;
          await adminClient.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: msgContent,
          });
          await adminClient.from("conversations").update({
            last_message_at: new Date().toISOString(),
            last_message_preview: msgContent.substring(0, 100),
          }).eq("id", conversationId);
        }
      } catch (chatErr) {
        console.error(`Chat error for tx ${d.tx_hash}:`, chatErr);
      }
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
