import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * record-instant-donation: Nhận tx_hash từ frontend khi user phát hiện
 * incoming transfer qua BSC RPC. Xác minh on-chain rồi ghi donation/post/notification/chat.
 */

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
  "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6": { symbol: "FUN", decimals: 18 },
};

const MIN_AMOUNTS: Record<string, number> = {
  USDT: 0.01, BTCB: 0.01, CAMLY: 1, FUN: 1,
};

function parseAmount(value: string, decimals: number): string {
  const raw = BigInt(value || "0");
  const divisor = BigInt(10 ** decimals);
  const intPart = raw / divisor;
  const fracPart = raw % divisor;
  return `${intPart}.${fracPart.toString().padStart(decimals, "0")}`.replace(/\.?0+$/, "") || "0";
}

// Verify transaction on-chain via BSC RPC
async function getTransactionReceipt(txHash: string, rpcUrl: string) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const json = await res.json();
  return json.result;
}

// ERC20 Transfer event topic
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { tx_hash, chain_id } = body;

    if (!tx_hash || typeof tx_hash !== "string" || !tx_hash.startsWith("0x")) {
      return new Response(JSON.stringify({ error: "tx_hash is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createAdminClient();

    // Check if already recorded
    const { data: existing } = await adminClient
      .from("donations").select("id").eq("tx_hash", tx_hash).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ status: "already_recorded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify on-chain
    const rpcUrl = chain_id === 97
      ? "https://data-seed-prebsc-1-s1.binance.org:8545"
      : "https://bsc-dataseed1.binance.org";

    const receipt = await getTransactionReceipt(tx_hash, rpcUrl);
    if (!receipt || receipt.status !== "0x1") {
      return new Response(JSON.stringify({ error: "Transaction not confirmed on-chain" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse Transfer logs
    const transferLogs = (receipt.logs || []).filter(
      (log: { topics: string[] }) => log.topics?.[0] === TRANSFER_TOPIC && log.topics?.length >= 3
    );

    if (transferLogs.length === 0) {
      return new Response(JSON.stringify({ error: "No ERC20 Transfer events found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's wallet
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, username, display_name")
      .eq("id", userId)
      .single();

    if (!userProfile?.public_wallet_address) {
      return new Response(JSON.stringify({ error: "User has no wallet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userWallet = userProfile.public_wallet_address.toLowerCase();

    // Find Transfer event TO user's wallet
    let matchedLog = null;
    for (const log of transferLogs) {
      const toAddr = "0x" + log.topics[2].slice(26).toLowerCase();
      if (toAddr === userWallet) {
        matchedLog = log;
        break;
      }
    }

    if (!matchedLog) {
      return new Response(JSON.stringify({ error: "No transfer to your wallet in this tx" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contractAddr = matchedLog.address.toLowerCase();
    const tokenInfo = KNOWN_TOKENS[contractAddr];
    if (!tokenInfo) {
      return new Response(JSON.stringify({ error: "Unknown token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromAddr = "0x" + matchedLog.topics[1].slice(26).toLowerCase();
    const rawValue = matchedLog.data || "0x0";
    const amount = parseAmount(BigInt(rawValue).toString(), tokenInfo.decimals);
    const numAmount = parseFloat(amount);
    const minAmount = MIN_AMOUNTS[tokenInfo.symbol] ?? 0.01;

    if (numAmount <= 0 || numAmount < minAmount) {
      return new Response(JSON.stringify({ error: "Amount too small (dust)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if sender is a fun.rich user
    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, username, display_name")
      .not("public_wallet_address", "is", null);

    const walletToProfile = new Map<string, { id: string; username: string; display_name: string | null }>();
    for (const p of allProfiles || []) {
      if (p.public_wallet_address) {
        walletToProfile.set(p.public_wallet_address.toLowerCase(), {
          id: p.id, username: p.username, display_name: p.display_name,
        });
      }
    }

    const senderProfile = walletToProfile.get(fromAddr);
    const senderName = senderProfile?.display_name || senderProfile?.username || "Ví ngoài";
    const recipientName = userProfile.display_name || userProfile.username;

    // Get block timestamp
    const blockRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_getBlockByNumber",
        params: [receipt.blockNumber, false],
      }),
    });
    const blockJson = await blockRes.json();
    const blockTimestamp = blockJson.result?.timestamp
      ? new Date(parseInt(blockJson.result.timestamp, 16) * 1000).toISOString()
      : new Date().toISOString();

    // Insert donation
    const donationData = {
      sender_id: senderProfile?.id || null,
      sender_address: fromAddr,
      recipient_id: userId,
      amount,
      token_symbol: tokenInfo.symbol,
      token_address: contractAddr,
      chain_id: chain_id || 56,
      tx_hash,
      status: "confirmed",
      confirmed_at: blockTimestamp,
      created_at: blockTimestamp,
      is_external: !senderProfile,
      card_theme: "celebration",
      card_sound: "rich-1",
      message: null,
      light_score_earned: 0,
      metadata: {
        sender_name: senderName,
        auto_scanned: true,
        scanner: "instant-detect",
      },
    };

    const { error: insertErr } = await adminClient.from("donations").insert(donationData);
    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(JSON.stringify({ status: "already_recorded" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Insert failed: ${insertErr.message}`);
    }

    // Create gift_celebration post
    const { data: postData } = await adminClient.from("posts").insert({
      user_id: senderProfile?.id || userId,
      content: `${senderName} đã tặng ${amount} ${tokenInfo.symbol} cho ${recipientName}`,
      post_type: "gift_celebration",
      tx_hash,
      gift_sender_id: senderProfile?.id || null,
      gift_recipient_id: userId,
      gift_token: tokenInfo.symbol,
      gift_amount: amount,
      gift_message: null,
      is_highlighted: true,
      visibility: "public",
      moderation_status: "approved",
      created_at: blockTimestamp,
    }).select("id").single();

    // Notification — always create, even for external wallets
    await adminClient.from("notifications").insert({
      user_id: userId,
      actor_id: senderProfile?.id || null,
      post_id: postData?.id || null,
      type: "donation",
      read: false,
      metadata: !senderProfile ? { sender_address: fromAddr, is_external: true } : null,
    });

    // Chat message
    const txShort = tx_hash.substring(0, 10) + "...";
    const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const msgContent = senderProfile
      ? `🎁 ${senderName} đã tặng bạn ${amount} ${tokenInfo.symbol}!\n💰 TX: ${txShort}`
      : `🎁 Ví ngoài (${shortenAddr(fromAddr)}) đã tặng bạn ${amount} ${tokenInfo.symbol}!\n💰 TX: ${txShort}`;

    if (senderProfile && senderProfile.id !== userId) {
      // Internal user → find or create direct conversation
      const { data: convs } = await adminClient
        .from("conversations")
        .select("id, conversation_participants!inner(user_id)")
        .eq("type", "direct");

      let convId: string | null = null;
      if (convs) {
        for (const c of convs) {
          const parts = (c.conversation_participants as { user_id: string }[]).map(p => p.user_id);
          if (parts.length === 2 && parts.includes(senderProfile.id) && parts.includes(userId)) {
            convId = c.id;
            break;
          }
        }
      }

      if (!convId) {
        const { data: newConv } = await adminClient
          .from("conversations").insert({ type: "direct", created_by: senderProfile.id }).select("id").single();
        if (newConv) {
          convId = newConv.id;
          await adminClient.from("conversation_participants").insert([
            { conversation_id: convId, user_id: senderProfile.id, role: "member" },
            { conversation_id: convId, user_id: userId, role: "member" },
          ]);
        }
      }

      if (convId) {
        await adminClient.from("messages").insert({
          conversation_id: convId, sender_id: senderProfile.id, content: msgContent,
        });
        await adminClient.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: msgContent.substring(0, 100),
        }).eq("id", convId);
      }
    } else if (!senderProfile) {
      // External wallet → create system notification conversation with recipient
      const { data: convs } = await adminClient
        .from("conversations")
        .select("id, conversation_participants!inner(user_id)")
        .eq("type", "direct");

      // Find self-conversation or create one for system messages
      let selfConvId: string | null = null;
      if (convs) {
        for (const c of convs) {
          const parts = (c.conversation_participants as { user_id: string }[]).map(p => p.user_id);
          if (parts.length === 1 && parts[0] === userId) {
            selfConvId = c.id;
            break;
          }
        }
      }

      if (!selfConvId) {
        const { data: newConv } = await adminClient
          .from("conversations").insert({ type: "direct", created_by: userId, name: "Thông báo hệ thống" }).select("id").single();
        if (newConv) {
          selfConvId = newConv.id;
          await adminClient.from("conversation_participants").insert([
            { conversation_id: selfConvId, user_id: userId, role: "member" },
          ]);
        }
      }

      if (selfConvId) {
        await adminClient.from("messages").insert({
          conversation_id: selfConvId, sender_id: userId, content: msgContent,
        });
        await adminClient.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: msgContent.substring(0, 100),
        }).eq("id", selfConvId);
      }
    }

    console.log(`Instant donation recorded: ${amount} ${tokenInfo.symbol} → ${recipientName} (tx: ${tx_hash})`);

    return new Response(JSON.stringify({
      status: "recorded",
      amount,
      token: tokenInfo.symbol,
      sender: senderName,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("record-instant-donation error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
