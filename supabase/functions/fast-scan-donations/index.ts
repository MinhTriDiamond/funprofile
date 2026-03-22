import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

/**
 * Fast-scan donations: Quét theo TOKEN CONTRACT thay vì từng ví.
 * Chỉ cần 8 API calls (4 token × 2 chain) thay vì 1054 calls.
 * Chạy mỗi 1 phút qua pg_cron.
 */

const TOKEN_CONTRACTS: { address: string; symbol: string; decimals: number; chains: string[] }[] = [
  { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", decimals: 18, chains: ["bsc"] },
  { address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", symbol: "BTCB", decimals: 18, chains: ["bsc"] },
  { address: "0x0910320181889fefde0bb1ca63962b0a8882e413", symbol: "CAMLY", decimals: 3, chains: ["bsc"] },
  { address: "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6", symbol: "FUN", decimals: 18, chains: ["bsc testnet"] },
];

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
  block_timestamp: string;
}

function parseAmount(value: string, decimals: number): string {
  const raw = BigInt(value || "0");
  const divisor = BigInt(10 ** decimals);
  const intPart = raw / divisor;
  const fracPart = raw % divisor;
  return `${intPart}.${fracPart.toString().padStart(decimals, "0")}`.replace(/\.?0+$/, "") || "0";
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisApiKey = Deno.env.get("MORALIS_API_KEY");
    if (!moralisApiKey) {
      return new Response(JSON.stringify({ error: "MORALIS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createAdminClient();

    // 1. Load all fun.rich wallets
    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, username, display_name")
      .not("public_wallet_address", "is", null);

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles with wallets", newTransfers: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build wallet → profile lookup (Set for fast membership check)
    const walletToProfile = new Map<string, { id: string; username: string; display_name: string | null }>();
    const walletSet = new Set<string>();
    for (const p of allProfiles) {
      if (p.public_wallet_address) {
        const addr = p.public_wallet_address.toLowerCase();
        walletToProfile.set(addr, { id: p.id, username: p.username, display_name: p.display_name });
        walletSet.add(addr);
      }
    }

    // 2. Fetch transfers for ALL token contracts in parallel
    const moralisHeaders = { "X-API-Key": moralisApiKey, Accept: "application/json" };
    const moralisBase = "https://deep-index.moralis.io/api/v2.2";

    const fetchPromises: Promise<{ symbol: string; decimals: number; contractAddr: string; chainId: number; transfers: MoralisTransfer[] }>[] = [];

    for (const token of TOKEN_CONTRACTS) {
      for (const chain of token.chains) {
        const chainParam = chain === "bsc testnet" ? "bsc%20testnet" : chain;
        const chainId = chain === "bsc testnet" ? 97 : 56;
        fetchPromises.push(
          fetch(`${moralisBase}/${token.address}/transfers?chain=${chainParam}&limit=100&order=DESC`, { headers: moralisHeaders })
            .then(async (res) => {
              if (!res.ok) { await res.text(); return { symbol: token.symbol, decimals: token.decimals, contractAddr: token.address, chainId, transfers: [] }; }
              const data = await res.json();
              return { symbol: token.symbol, decimals: token.decimals, contractAddr: token.address, chainId, transfers: (data.result || []) as MoralisTransfer[] };
            })
            .catch(() => ({ symbol: token.symbol, decimals: token.decimals, contractAddr: token.address, chainId, transfers: [] as MoralisTransfer[] }))
        );
      }
    }

    const results = await Promise.all(fetchPromises);

    // 3. Filter: only transfers TO fun.rich wallets
    const candidateTransfers: {
      transfer: MoralisTransfer;
      symbol: string;
      decimals: number;
      contractAddr: string;
      chainId: number;
    }[] = [];

    for (const r of results) {
      for (const t of r.transfers) {
        const toAddr = t.to_address?.toLowerCase();
        if (toAddr && walletSet.has(toAddr)) {
          candidateTransfers.push({ transfer: t, symbol: r.symbol, decimals: r.decimals, contractAddr: r.contractAddr, chainId: r.chainId });
        }
      }
    }

    if (candidateTransfers.length === 0) {
      console.log("Fast-scan: no relevant transfers found");
      return new Response(JSON.stringify({ newTransfers: 0, message: "Không có giao dịch mới" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Dedup against existing donations + posts
    const txHashes = [...new Set(candidateTransfers.map(c => c.transfer.transaction_hash).filter(Boolean))];
    const [{ data: existingDonations }, { data: existingPosts }] = await Promise.all([
      adminClient.from("donations").select("tx_hash").in("tx_hash", txHashes),
      adminClient.from("posts").select("tx_hash").eq("post_type", "gift_celebration").in("tx_hash", txHashes),
    ]);

    const existingSet = new Set([
      ...(existingDonations || []).map(d => d.tx_hash),
      ...(existingPosts || []).map(p => p.tx_hash),
    ]);

    const newTransfers = candidateTransfers.filter(c => c.transfer.transaction_hash && !existingSet.has(c.transfer.transaction_hash));

    if (newTransfers.length === 0) {
      console.log("Fast-scan: all transfers already recorded");
      return new Response(JSON.stringify({ newTransfers: 0, message: "Tất cả giao dịch đã được ghi nhận" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Build donation records
    const donationsToInsert: Record<string, unknown>[] = [];
    for (const { transfer, symbol, decimals, contractAddr, chainId } of newTransfers) {
      const amount = parseAmount(transfer.value, decimals);
      const numAmount = parseFloat(amount);
      const minAmount = MIN_AMOUNTS[symbol] ?? 0.01;
      if (numAmount <= 0 || numAmount < minAmount) continue;

      const senderAddr = transfer.from_address.toLowerCase();
      const recipientAddr = transfer.to_address.toLowerCase();
      const senderProfile = walletToProfile.get(senderAddr);
      const recipientProfile = walletToProfile.get(recipientAddr);
      if (!recipientProfile) continue;

      donationsToInsert.push({
        sender_id: senderProfile?.id || null,
        sender_address: senderAddr,
        recipient_id: recipientProfile.id,
        amount,
        token_symbol: symbol,
        token_address: contractAddr,
        chain_id: chainId,
        tx_hash: transfer.transaction_hash,
        status: "confirmed",
        confirmed_at: transfer.block_timestamp,
        created_at: transfer.block_timestamp,
        is_external: !senderProfile,
        card_theme: "celebration",
        card_sound: "rich-1",
        message: null,
        light_score_earned: 0,
        metadata: {
          sender_name: senderProfile?.display_name || senderProfile?.username || "Ví ngoài",
          auto_scanned: true,
          scanner: "fast-scan",
        },
      });
    }

    if (donationsToInsert.length === 0) {
      return new Response(JSON.stringify({ newTransfers: 0, message: "Không có giao dịch hợp lệ mới" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Insert donations
    let totalInserted = 0;
    const postsToInsert: Record<string, unknown>[] = [];
    const internalDonations: Record<string, unknown>[] = [];

    for (let i = 0; i < donationsToInsert.length; i += 50) {
      const batch = donationsToInsert.slice(i, i + 50);
      const { error: insertError } = await adminClient.from("donations").insert(batch);
      if (insertError) {
        console.error("Insert error:", insertError);
        continue;
      }
      totalInserted += batch.length;

      for (const d of batch) {
        const senderId = d.sender_id as string | null;
        const recipientId = d.recipient_id as string;
        const senderProfile = walletToProfile.get((d.sender_address as string) || "");
        const recipientProfile = walletToProfile.get(
          [...walletToProfile.entries()].find(([, v]) => v.id === recipientId)?.[0] || ""
        );

        const senderName = senderProfile?.display_name || senderProfile?.username || "Ví ngoài";
        const recipientName = recipientProfile?.display_name || recipientProfile?.username || "Unknown";

        postsToInsert.push({
          user_id: senderId || recipientId,
          content: `${senderName} đã tặng ${d.amount} ${d.token_symbol} cho ${recipientName}`,
          post_type: "gift_celebration",
          tx_hash: d.tx_hash,
          gift_sender_id: senderId,
          gift_recipient_id: recipientId,
          gift_token: d.token_symbol,
          gift_amount: String(d.amount),
          gift_message: null,
          is_highlighted: true,
          highlight_expires_at: null,
          visibility: "public",
          moderation_status: "approved",
          created_at: d.created_at,
        });

        // Push ALL donations for notification/chat — not just internal
        internalDonations.push(d);
      }
    }

    // 7. Insert posts + notifications + chat messages
    if (postsToInsert.length > 0) {
      const postTxHashes = postsToInsert.map(p => p.tx_hash as string).filter(Boolean);
      const { data: existingPostsCheck } = await adminClient
        .from("posts").select("tx_hash").eq("post_type", "gift_celebration").in("tx_hash", postTxHashes);
      const existingPostSet = new Set((existingPostsCheck || []).map(p => p.tx_hash));
      const newPosts = postsToInsert.filter(p => !existingPostSet.has(p.tx_hash as string));

      const insertedPostsByTx = new Map<string, string>();
      for (let i = 0; i < newPosts.length; i += 50) {
        const batch = newPosts.slice(i, i + 50);
        const { data: inserted, error: postErr } = await adminClient.from("posts").insert(batch).select("id, tx_hash");
        if (postErr) console.error("Post insert error:", postErr);
        else {
          for (const p of inserted || []) insertedPostsByTx.set(p.tx_hash, p.id);
        }
      }

      // Notifications — for ALL donations (internal + external)
      const notifs = internalDonations
        .filter(d => !existingPostSet.has(d.tx_hash as string))
        .map(d => ({
          user_id: d.recipient_id as string,
          actor_id: (d.sender_id as string) || null,
          post_id: insertedPostsByTx.get(d.tx_hash as string) || null,
          type: "donation",
          read: false,
        }));

      if (notifs.length > 0) {
        for (let i = 0; i < notifs.length; i += 50) {
          const { error } = await adminClient.from("notifications").insert(notifs.slice(i, i + 50));
          if (error) console.error("Notif error:", error);
        }
      }

      // Chat messages for ALL donations (internal + external)
      for (const d of internalDonations) {
        if (existingPostSet.has(d.tx_hash as string)) continue;
        const senderId = d.sender_id as string | null;
        const recipientId = d.recipient_id as string;
        if (senderId && senderId === recipientId) continue;

        try {
          const senderProfile = walletToProfile.get((d.sender_address as string) || "");
          const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
          const senderName = senderProfile?.display_name || senderProfile?.username || `Ví ngoài (${shortenAddr((d.sender_address as string) || "0x")})`;
          const txShort = (d.tx_hash as string).substring(0, 10) + "...";
          const msgContent = `🎁 ${senderName} đã tặng bạn ${d.amount} ${d.token_symbol}!\n💰 TX: ${txShort}`;

          if (senderId) {
            // Internal: find or create direct conversation between sender and recipient
            const { data: existingConvs } = await adminClient
              .from("conversations")
              .select("id, conversation_participants!inner(user_id)")
              .eq("type", "direct");

            let conversationId: string | null = null;
            if (existingConvs) {
              for (const conv of existingConvs) {
                const parts = (conv.conversation_participants as { user_id: string }[]).map(p => p.user_id);
                if (parts.length === 2 && parts.includes(senderId) && parts.includes(recipientId)) {
                  conversationId = conv.id;
                  break;
                }
              }
            }

            if (!conversationId) {
              const { data: newConv } = await adminClient
                .from("conversations").insert({ type: "direct", created_by: senderId }).select("id").single();
              if (newConv) {
                conversationId = newConv.id;
                await adminClient.from("conversation_participants").insert([
                  { conversation_id: conversationId, user_id: senderId, role: "member" },
                  { conversation_id: conversationId, user_id: recipientId, role: "member" },
                ]);
              }
            }

            if (conversationId) {
              await adminClient.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, content: msgContent });
              await adminClient.from("conversations").update({
                last_message_at: new Date().toISOString(),
                last_message_preview: msgContent.substring(0, 100),
              }).eq("id", conversationId);
            }
          } else {
            // External wallet: send system message to recipient's self-conversation
            const { data: existingConvs } = await adminClient
              .from("conversations")
              .select("id, conversation_participants!inner(user_id)")
              .eq("type", "direct")
              .eq("name", "Thông báo hệ thống");

            let selfConvId: string | null = null;
            if (existingConvs) {
              for (const conv of existingConvs) {
                const parts = (conv.conversation_participants as { user_id: string }[]).map(p => p.user_id);
                if (parts.length === 1 && parts[0] === recipientId) {
                  selfConvId = conv.id;
                  break;
                }
              }
            }

            if (!selfConvId) {
              const { data: newConv } = await adminClient
                .from("conversations").insert({ type: "direct", created_by: recipientId, name: "Thông báo hệ thống" }).select("id").single();
              if (newConv) {
                selfConvId = newConv.id;
                await adminClient.from("conversation_participants").insert([
                  { conversation_id: selfConvId, user_id: recipientId, role: "member" },
                ]);
              }
            }

            if (selfConvId) {
              await adminClient.from("messages").insert({ conversation_id: selfConvId, sender_id: recipientId, content: msgContent });
              await adminClient.from("conversations").update({
                last_message_at: new Date().toISOString(),
                last_message_preview: msgContent.substring(0, 100),
              }).eq("id", selfConvId);
            }
          }
        } catch (chatErr) {
          console.error(`Chat error for tx ${d.tx_hash}:`, chatErr);
        }
      }
    }

    console.log(`Fast-scan complete: ${totalInserted} new donations`);
    return new Response(JSON.stringify({
      newTransfers: totalInserted,
      candidatesFound: candidateTransfers.length,
      message: `Tìm thấy ${totalInserted} giao dịch mới`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("fast-scan-donations error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
