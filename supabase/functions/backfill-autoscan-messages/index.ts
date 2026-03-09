import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

/**
 * One-time backfill: Tạo notifications + chat messages cho tất cả
 * auto-scanned donations đã có nhưng chưa có notification/tin nhắn.
 */

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const adminClient = createAdminClient();

    // Get all internal auto-scanned donations
    const { data: donations, error: fetchErr } = await adminClient
      .from("donations")
      .select("id, sender_id, recipient_id, amount, token_symbol, tx_hash, created_at, sender_address")
      .not("sender_id", "is", null)
      .not("recipient_id", "is", null)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true })
      .limit(1000);

    if (fetchErr) throw fetchErr;
    if (!donations || donations.length === 0) {
      return new Response(JSON.stringify({ message: "No donations to backfill", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only auto-scanned (metadata has auto_scanned=true) or donations from Father
    // Actually get ALL internal donations to be safe
    console.log(`Found ${donations.length} internal donations to check`);

    // Get all profiles for sender/recipient names
    const userIds = [...new Set(donations.flatMap(d => [d.sender_id, d.recipient_id]))];
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    const profileMap = new Map<string, { username: string; display_name: string | null }>();
    for (const p of profiles || []) {
      profileMap.set(p.id, { username: p.username, display_name: p.display_name });
    }

    // Get existing notifications to avoid duplicates (by type=donation and actor+user combo with matching post)
    const txHashes = donations.map(d => d.tx_hash);

    // Get posts linked to these tx_hashes for notification post_id
    const { data: posts } = await adminClient
      .from("posts")
      .select("id, tx_hash")
      .eq("post_type", "gift_celebration")
      .in("tx_hash", txHashes);

    const postByTx = new Map<string, string>();
    for (const p of posts || []) {
      if (p.tx_hash) postByTx.set(p.tx_hash, p.id);
    }

    // Check existing notifications for these donations
    const { data: existingNotifs } = await adminClient
      .from("notifications")
      .select("id, user_id, actor_id, type, post_id")
      .eq("type", "donation")
      .in("actor_id", [...new Set(donations.map(d => d.sender_id))]);

    const existingNotifSet = new Set(
      (existingNotifs || []).map(n => `${n.actor_id}_${n.user_id}_${n.post_id}`)
    );

    // Insert missing notifications
    const notificationsToInsert = [];
    for (const d of donations) {
      const postId = postByTx.get(d.tx_hash) || null;
      const key = `${d.sender_id}_${d.recipient_id}_${postId}`;
      if (!existingNotifSet.has(key)) {
        notificationsToInsert.push({
          user_id: d.recipient_id,
          actor_id: d.sender_id,
          post_id: postId,
          type: "donation",
          read: false,
          created_at: d.created_at,
        });
      }
    }

    let notifCount = 0;
    for (let i = 0; i < notificationsToInsert.length; i += 50) {
      const batch = notificationsToInsert.slice(i, i + 50);
      const { error } = await adminClient.from("notifications").insert(batch);
      if (error) console.error("Notif insert error:", error);
      else notifCount += batch.length;
    }
    console.log(`Inserted ${notifCount} notifications`);

    // Now send chat messages - group donations by sender+recipient pair
    const pairMap = new Map<string, typeof donations>();
    for (const d of donations) {
      if (d.sender_id === d.recipient_id) continue;
      const key = `${d.sender_id}_${d.recipient_id}`;
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key)!.push(d);
    }

    let msgCount = 0;

    for (const [pairKey, pairDonations] of pairMap) {
      const [senderId, recipientId] = pairKey.split("_");
      const senderProfile = profileMap.get(senderId);
      const senderName = senderProfile?.display_name || senderProfile?.username || "Unknown";

      try {
        // Find existing direct conversation
        const { data: existingConvs } = await adminClient
          .from("conversation_participants")
          .select("conversation_id, user_id, conversations!inner(id, type)")
          .eq("conversations.type", "direct")
          .in("user_id", [senderId, recipientId]);

        let conversationId: string | null = null;

        // Group by conversation_id to find one with both users
        if (existingConvs && existingConvs.length > 0) {
          const convParticipants = new Map<string, string[]>();
          for (const cp of existingConvs) {
            const cid = cp.conversation_id;
            if (!convParticipants.has(cid)) convParticipants.set(cid, []);
            convParticipants.get(cid)!.push(cp.user_id);
          }
          for (const [cid, users] of convParticipants) {
            if (users.includes(senderId) && users.includes(recipientId)) {
              conversationId = cid;
              break;
            }
          }
        }

        // Create conversation if not exists
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
              { conversation_id: conversationId, user_id: recipientId, role: "member" },
            ]);
          }
        }

        if (!conversationId) continue;

        // Check existing messages in this conversation to avoid duplicates
        const { data: existingMsgs } = await adminClient
          .from("messages")
          .select("content")
          .eq("conversation_id", conversationId)
          .eq("sender_id", senderId)
          .like("content", "%đã tặng bạn%")
          .limit(100);

        const existingMsgSet = new Set((existingMsgs || []).map(m => m.content));

        // Send one message per donation
        let lastMsgContent = "";
        for (const d of pairDonations) {
          const txShort = d.tx_hash.substring(0, 10) + "...";
          const msgContent = `🎁 ${senderName} đã tặng bạn ${d.amount} ${d.token_symbol}!\n💰 TX: ${txShort}`;

          if (existingMsgSet.has(msgContent)) continue;

          const { error: msgErr } = await adminClient.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: msgContent,
            created_at: d.created_at,
          });
          if (msgErr) {
            console.error(`Msg insert error:`, msgErr);
          } else {
            msgCount++;
            lastMsgContent = msgContent;
          }
        }

        // Update conversation last_message
        if (lastMsgContent) {
          await adminClient.from("conversations").update({
            last_message_at: new Date().toISOString(),
            last_message_preview: lastMsgContent.substring(0, 100),
          }).eq("id", conversationId);
        }
      } catch (err) {
        console.error(`Error for pair ${pairKey}:`, err);
      }
    }

    console.log(`Backfill complete: ${notifCount} notifications, ${msgCount} messages`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notifCount,
        messages_sent: msgCount,
        donations_checked: donations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("backfill error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
