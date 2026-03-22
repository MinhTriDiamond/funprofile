/**
 * Shared helper: Tạo post, notification, chat message cho donation đã insert thành công.
 * Dùng chung cho auto-scan, fast-scan, scan-my-incoming, auto-backfill.
 */

interface DonationRecord {
  tx_hash: string;
  sender_id: string | null;
  sender_address: string;
  recipient_id: string;
  amount: string;
  token_symbol: string;
  is_external: boolean;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface ProfileInfo {
  id: string;
  username: string;
  display_name: string | null;
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Tạo gift_celebration post cho 1 donation.
 * Returns post record to insert (caller batches).
 */
export function buildGiftPost(
  d: DonationRecord,
  senderProfile: ProfileInfo | null,
  recipientProfile: ProfileInfo | null,
): Record<string, unknown> {
  const isExternal = !d.sender_id;
  const senderName = isExternal
    ? shortenAddr(d.sender_address)
    : (senderProfile?.display_name || senderProfile?.username || "Unknown");
  const recipientName = recipientProfile?.display_name || recipientProfile?.username || "Unknown";

  return {
    user_id: d.sender_id || d.recipient_id,
    content: isExternal
      ? `Ví ngoài ${senderName} đã tặng ${d.amount} ${d.token_symbol} cho ${recipientName}`
      : `${senderName} đã tặng ${d.amount} ${d.token_symbol} cho ${recipientName}`,
    post_type: "gift_celebration",
    tx_hash: d.tx_hash,
    gift_sender_id: d.sender_id || null,
    gift_recipient_id: d.recipient_id,
    gift_token: d.token_symbol,
    gift_amount: String(d.amount),
    gift_message: null,
    is_highlighted: true,
    highlight_expires_at: null,
    visibility: "public",
    moderation_status: "approved",
    created_at: d.created_at,
    metadata: isExternal ? {
      is_external: true,
      sender_address: d.sender_address,
      sender_name: (d.metadata?.sender_name as string) || `Ví ngoài`,
    } : null,
  };
}

/**
 * Insert posts, notifications, and chat messages for a batch of donations.
 * Handles dedup by tx_hash.
 */
export async function createDonationEffects(
  adminClient: any,
  donations: DonationRecord[],
  walletToProfile: Map<string, ProfileInfo>,
) {
  if (donations.length === 0) return { postsCreated: 0, notifsCreated: 0, chatsCreated: 0 };

  // 1. Dedup: check existing posts
  const txHashes = donations.map(d => d.tx_hash).filter(Boolean);
  const { data: existingPosts } = await adminClient
    .from("posts")
    .select("tx_hash")
    .eq("post_type", "gift_celebration")
    .in("tx_hash", txHashes);

  const existingPostSet = new Set((existingPosts || []).map((p: any) => p.tx_hash));
  const newDonations = donations.filter(d => !existingPostSet.has(d.tx_hash));

  if (newDonations.length === 0) return { postsCreated: 0, notifsCreated: 0, chatsCreated: 0 };

  // 2. Build posts
  const postsToInsert = newDonations.map(d => {
    const senderProfile = d.sender_id
      ? findProfileById(walletToProfile, d.sender_id)
      : null;
    const recipientProfile = findProfileById(walletToProfile, d.recipient_id);
    return buildGiftPost(d, senderProfile, recipientProfile);
  });

  // 3. Insert posts in batches
  const insertedPostsByTx = new Map<string, string>();
  let postsCreated = 0;
  for (let i = 0; i < postsToInsert.length; i += 50) {
    const batch = postsToInsert.slice(i, i + 50);
    const { data: inserted, error } = await adminClient
      .from("posts")
      .insert(batch)
      .select("id, tx_hash");
    if (error) {
      console.error("Post insert error:", error);
    } else {
      postsCreated += (inserted || []).length;
      for (const p of inserted || []) {
        insertedPostsByTx.set(p.tx_hash, p.id);
      }
    }
  }

  // 4. Notifications
  const notifs = newDonations.map(d => ({
    user_id: d.recipient_id,
    actor_id: d.sender_id || d.recipient_id,
    post_id: insertedPostsByTx.get(d.tx_hash) || null,
    type: "donation",
    read: false,
  }));

  let notifsCreated = 0;
  for (let i = 0; i < notifs.length; i += 50) {
    const batch = notifs.slice(i, i + 50);
    const { error } = await adminClient.from("notifications").insert(batch);
    if (error) console.error("Notif insert error:", error);
    else notifsCreated += batch.length;
  }

  // 5. Chat messages
  let chatsCreated = 0;
  for (const d of newDonations) {
    try {
      const created = await sendDonationChatMessage(adminClient, d, walletToProfile);
      if (created) chatsCreated++;
    } catch (err) {
      console.error(`Chat error for tx ${d.tx_hash}:`, err);
    }
  }

  return { postsCreated, notifsCreated, chatsCreated };
}

async function sendDonationChatMessage(
  adminClient: any,
  d: DonationRecord,
  walletToProfile: Map<string, ProfileInfo>,
): Promise<boolean> {
  const senderId = d.sender_id;
  const recipientId = d.recipient_id;
  if (senderId && senderId === recipientId) return false;

  const senderProfile = senderId ? findProfileById(walletToProfile, senderId) : null;
  const senderName = senderProfile?.display_name || senderProfile?.username
    || `Ví ngoài (${shortenAddr(d.sender_address)})`;
  const txShort = d.tx_hash.substring(0, 10) + "...";
  const msgContent = `🎁 ${senderName} đã tặng bạn ${d.amount} ${d.token_symbol}!\n💰 TX: ${txShort}`;

  if (senderId) {
    // Internal: find or create direct conversation
    const conversationId = await findOrCreateDirectConversation(adminClient, senderId, recipientId);
    if (conversationId) {
      await adminClient.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, content: msgContent });
      await adminClient.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: msgContent.substring(0, 100),
      }).eq("id", conversationId);
      return true;
    }
  } else {
    // External: system conversation for recipient
    const selfConvId = await findOrCreateSystemConversation(adminClient, recipientId);
    if (selfConvId) {
      await adminClient.from("messages").insert({ conversation_id: selfConvId, sender_id: recipientId, content: msgContent });
      await adminClient.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: msgContent.substring(0, 100),
      }).eq("id", selfConvId);
      return true;
    }
  }
  return false;
}

async function findOrCreateDirectConversation(
  adminClient: any,
  userId1: string,
  userId2: string,
): Promise<string | null> {
  const { data: existingConvs } = await adminClient
    .from("conversations")
    .select("id, conversation_participants!inner(user_id)")
    .eq("type", "direct");

  if (existingConvs) {
    for (const conv of existingConvs) {
      const parts = (conv.conversation_participants as { user_id: string }[]).map(p => p.user_id);
      if (parts.length === 2 && parts.includes(userId1) && parts.includes(userId2)) {
        return conv.id;
      }
    }
  }

  const { data: newConv } = await adminClient
    .from("conversations").insert({ type: "direct", created_by: userId1 }).select("id").single();
  if (!newConv) return null;

  await adminClient.from("conversation_participants").insert([
    { conversation_id: newConv.id, user_id: userId1, role: "member" },
    { conversation_id: newConv.id, user_id: userId2, role: "member" },
  ]);
  return newConv.id;
}

async function findOrCreateSystemConversation(
  adminClient: any,
  userId: string,
): Promise<string | null> {
  const { data: existingConvs } = await adminClient
    .from("conversations")
    .select("id, conversation_participants!inner(user_id)")
    .eq("type", "direct")
    .eq("name", "Thông báo hệ thống");

  if (existingConvs) {
    for (const conv of existingConvs) {
      const parts = (conv.conversation_participants as { user_id: string }[]).map(p => p.user_id);
      if (parts.length === 1 && parts[0] === userId) {
        return conv.id;
      }
    }
  }

  const { data: newConv } = await adminClient
    .from("conversations").insert({ type: "direct", created_by: userId, name: "Thông báo hệ thống" }).select("id").single();
  if (!newConv) return null;

  await adminClient.from("conversation_participants").insert([
    { conversation_id: newConv.id, user_id: userId, role: "member" },
  ]);
  return newConv.id;
}

function findProfileById(
  walletToProfile: Map<string, ProfileInfo>,
  userId: string,
): ProfileInfo | null {
  for (const [, profile] of walletToProfile) {
    if (profile.id === userId) return profile;
  }
  return null;
}
