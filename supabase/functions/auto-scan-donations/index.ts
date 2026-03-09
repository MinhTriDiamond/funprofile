import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

/**
 * Auto-scan donations: Tự động quét giao dịch OUTGOING từ các ví Fun Profile
 * đến các ví Fun Profile khác (on-chain trực tiếp, không qua Gift Dialog).
 * Được gọi bởi pg_cron mỗi 5 phút.
 */

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
};

const FUN_TOKEN_ADDRESS = "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6";

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

function parseAmount(value: string, decimals: number): string {
  const rawValue = BigInt(value || "0");
  const divisor = BigInt(10 ** decimals);
  const intPart = rawValue / divisor;
  const fracPart = rawValue % divisor;
  return `${intPart}.${fracPart.toString().padStart(decimals, "0")}`.replace(/\.?0+$/, "") || "0";
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

    const adminClient = createAdminClient();

    // Get ALL profiles with public_wallet_address
    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, username, display_name")
      .not("public_wallet_address", "is", null);

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles with wallets", newTransfers: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build wallet → profile map
    const walletToProfile = new Map<string, { id: string; username: string; display_name: string | null }>();
    const allWalletAddresses: string[] = [];
    for (const p of allProfiles) {
      if (p.public_wallet_address) {
        const addr = p.public_wallet_address.toLowerCase();
        walletToProfile.set(addr, {
          id: p.id,
          username: p.username,
          display_name: p.display_name,
        });
        allWalletAddresses.push(addr);
      }
    }

    // Scan outgoing transfers from each Fun Profile wallet
    // To avoid too many API calls, we batch: scan wallets that have recent activity
    // Strategy: scan ALL wallets' incoming transfers by querying each wallet
    // But that's too many calls. Better: scan outgoing from active senders.
    // 
    // Optimized approach: Query each wallet for INCOMING transfers
    // But limit to max 20 wallets per cron run to stay within rate limits.
    // We rotate through all wallets across multiple runs.

    // Get the last scan cursor (which wallet index we scanned last)
    const BATCH_SIZE = 10; // wallets per cron run
    const { data: cursorData } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "auto_scan_cursor")
      .single();

    let startIndex = 0;
    if (cursorData?.value) {
      startIndex = parseInt(cursorData.value as string) || 0;
      if (startIndex >= allWalletAddresses.length) startIndex = 0;
    }

    const endIndex = Math.min(startIndex + BATCH_SIZE, allWalletAddresses.length);
    const walletsToScan = allWalletAddresses.slice(startIndex, endIndex);
    const nextCursor = endIndex >= allWalletAddresses.length ? 0 : endIndex;

    console.log(`Scanning wallets ${startIndex}-${endIndex} of ${allWalletAddresses.length}`);

    const moralisHeaders = { "X-API-Key": moralisApiKey, Accept: "application/json" };
    const moralisBase = "https://deep-index.moralis.io/api/v2.2";

    let totalNewTransfers = 0;
    const allDonationsToInsert: Record<string, unknown>[] = [];

    // Scan each wallet for incoming transfers
    for (const walletAddr of walletsToScan) {
      try {
        const [mainnetRes, testnetRes] = await Promise.all([
          fetch(`${moralisBase}/${walletAddr}/erc20/transfers?chain=bsc&limit=50&order=DESC`, { headers: moralisHeaders }),
          fetch(`${moralisBase}/${walletAddr}/erc20/transfers?chain=bsc+testnet&limit=50&order=DESC`, { headers: moralisHeaders }),
        ]);

        let transfers: MoralisTransfer[] = [];

        if (mainnetRes.ok) {
          const data = await mainnetRes.json();
          transfers.push(...(data.result || []));
        } else {
          await mainnetRes.text(); // consume body
        }

        if (testnetRes.ok) {
          const data = await testnetRes.json();
          transfers.push(...(data.result || []));
        } else {
          await testnetRes.text(); // consume body
        }

        // Filter: incoming to this wallet, known tokens only
        const recipientProfile = walletToProfile.get(walletAddr);
        if (!recipientProfile) continue;

        const incoming = transfers.filter((t) => {
          const to = t.to_address?.toLowerCase();
          if (to !== walletAddr) return false;
          const contract = t.address?.toLowerCase() || "";
          return !!KNOWN_TOKENS[contract] || contract === FUN_TOKEN_ADDRESS;
        });

        if (incoming.length === 0) continue;

        // Check existing tx_hashes
        const txHashes = incoming.map((t) => t.transaction_hash).filter(Boolean);
        const { data: existing } = await adminClient
          .from("donations")
          .select("tx_hash")
          .in("tx_hash", txHashes);

        const existingSet = new Set((existing || []).map((d) => d.tx_hash));
        const newTransfers = incoming.filter((t) => t.transaction_hash && !existingSet.has(t.transaction_hash));

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

          const amount = parseAmount(transfer.value, tokenDecimals);
          const senderAddr = transfer.from_address.toLowerCase();
          const senderProfile = walletToProfile.get(senderAddr);

          allDonationsToInsert.push({
            sender_id: senderProfile?.id || null,
            sender_address: senderAddr,
            recipient_id: recipientProfile.id,
            amount,
            token_symbol: tokenSymbol,
            token_address: contractAddr,
            chain_id: isFun ? 97 : 56,
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
            },
          });
        }
      } catch (walletErr) {
        console.error(`Error scanning wallet ${walletAddr}:`, walletErr);
        // Continue to next wallet
      }
    }

    // Insert all new donations + create gift_celebration posts
    if (allDonationsToInsert.length > 0) {
      const postsToInsert: Record<string, unknown>[] = [];

      for (let i = 0; i < allDonationsToInsert.length; i += 50) {
        const batch = allDonationsToInsert.slice(i, i + 50);
        const { error: insertError } = await adminClient
          .from("donations")
          .insert(batch);
        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          totalNewTransfers += batch.length;

          // Create gift_celebration posts for internal (user-to-user) donations
          for (const d of batch) {
            const senderId = d.sender_id as string | null;
            const recipientId = d.recipient_id as string | null;
            if (!senderId || !recipientId) continue;

            const senderProfile = walletToProfile.get((d.sender_address as string) || "");
            const recipientProfile = walletToProfile.get(
              allWalletAddresses.find(w => walletToProfile.get(w)?.id === recipientId) || ""
            );

            const senderName = senderProfile?.display_name || senderProfile?.username || "Unknown";
            const recipientName = recipientProfile?.display_name || recipientProfile?.username || "Unknown";

            postsToInsert.push({
              user_id: senderId,
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
          }
        }
      }

      // Check existing posts to avoid duplicates
      if (postsToInsert.length > 0) {
        const postTxHashes = postsToInsert.map(p => p.tx_hash as string).filter(Boolean);
        const { data: existingPosts } = await adminClient
          .from("posts")
          .select("tx_hash")
          .eq("post_type", "gift_celebration")
          .in("tx_hash", postTxHashes);

        const existingPostSet = new Set((existingPosts || []).map(p => p.tx_hash));
        const newPosts = postsToInsert.filter(p => !existingPostSet.has(p.tx_hash as string));

        for (let i = 0; i < newPosts.length; i += 50) {
          const batch = newPosts.slice(i, i + 50);
          const { error: postErr } = await adminClient.from("posts").insert(batch);
          if (postErr) console.error("Post insert error:", postErr);
          else console.log(`Created ${batch.length} gift_celebration posts`);
        }
      }
    }

    // Update cursor for next run
    await adminClient
      .from("app_settings")
      .upsert({ key: "auto_scan_cursor", value: String(nextCursor) }, { onConflict: "key" });

    console.log(`Auto-scan complete: ${totalNewTransfers} new transfers found, next cursor: ${nextCursor}`);

    return new Response(
      JSON.stringify({
        newTransfers: totalNewTransfers,
        walletsScanned: walletsToScan.length,
        nextCursor,
        message: `Quét ${walletsToScan.length} ví, tìm thấy ${totalNewTransfers} giao dịch mới`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("auto-scan-donations error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
