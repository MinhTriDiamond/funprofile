// @ts-ignore Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DonationRequest {
  sender_id: string;
  recipient_id: string;
  amount: string;
  token_symbol: string;
  token_address: string | null;
  chain_id: number;
  tx_hash: string;
  message?: string;
  message_template?: string;
  post_id?: string;
  card_theme?: string;
  card_sound?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DonationRequest = await req.json();

    if (!body.sender_id || !body.recipient_id || !body.amount || !body.tx_hash) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Sender does not match authenticated user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check sender profile status - block banned/on_hold users
    const { data: senderStatus } = await supabase
      .from("profiles")
      .select("reward_status, is_banned")
      .eq("id", user.id)
      .single();

    if (senderStatus?.is_banned) {
      return new Response(
        JSON.stringify({ error: "Tài khoản đã bị cấm. Không thể thực hiện giao dịch." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: on_hold/rejected only affects claim-reward, not donations
    // Donations are blockchain transactions that must be recorded for transparency

    // Check duplicate
    const { data: existingDonation } = await supabase
      .from("donations")
      .select("id")
      .eq("tx_hash", body.tx_hash)
      .single();

    if (existingDonation) {
      return new Response(
        JSON.stringify({ error: "Transaction already recorded", donation: existingDonation }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate Light Score
    const amount = parseFloat(body.amount);
    const lightScoreEarned = Math.floor(amount / 100);

    // Create light_action
    let lightActionId = null;
    if (lightScoreEarned > 0) {
      const { data: lightAction } = await supabase
        .from("light_actions")
        .insert({
          user_id: body.sender_id,
          action_type: "donate",
          reference_type: body.post_id ? "post" : "profile",
          reference_id: body.post_id || body.recipient_id,
          content_preview: `Tặng ${body.amount} ${body.token_symbol} cho @${body.recipient_id.slice(0, 8)}`,
          base_reward: 50,
          quality_score: 1.0,
          impact_score: Math.min(5.0, 1 + amount / 1000),
          integrity_score: 1.0,
          unity_score: 80,
          light_score: lightScoreEarned * 10,
          mint_status: "pending",
          mint_amount: lightScoreEarned,
        })
        .select("id")
        .single();

      if (lightAction) lightActionId = lightAction.id;
    }

    // Insert donation
    const { data: donation, error: insertError } = await supabase
      .from("donations")
      .insert({
        sender_id: body.sender_id,
        recipient_id: body.recipient_id,
        post_id: body.post_id || null,
        amount: body.amount,
        token_symbol: body.token_symbol,
        token_address: body.token_address,
        chain_id: body.chain_id,
        tx_hash: body.tx_hash,
        message: body.message,
        message_template: body.message_template,
        status: "confirmed",
        light_score_earned: lightScoreEarned,
        light_action_id: lightActionId,
        confirmed_at: new Date().toISOString(),
        card_theme: body.card_theme || "celebration",
        card_sound: body.card_sound || "rich-1",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting donation:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record donation", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create conversation & message
    let conversationId = null;
    let messageId = null;

    // Step 1: get recipient's conversation IDs as a plain array
    const { data: recipientConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", body.recipient_id);

    const recipientConvIds = (recipientConvs || []).map((r: any) => r.conversation_id);

    // Step 2: find sender's conversations that overlap with recipient's
    const { data: existingConv } = recipientConvIds.length > 0
      ? await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", body.sender_id)
          .in("conversation_id", recipientConvIds)
      : { data: [] };

    if (existingConv && existingConv.length > 0) {
      for (const conv of existingConv) {
        const { data: convData } = await supabase
          .from("conversations")
          .select("id, type")
          .eq("id", conv.conversation_id)
          .eq("type", "direct")
          .single();
        if (convData) { conversationId = convData.id; break; }
      }
    }

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ type: "direct" })
        .select("id")
        .single();
      if (newConv) {
        conversationId = newConv.id;
        await supabase.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: body.sender_id, role: "member" },
          { conversation_id: conversationId, user_id: body.recipient_id, role: "member" },
        ]);
      }
    }

    // Fetch senderProfile BEFORE conversation block - used for both message and gift post
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", body.sender_id)
      .single();

    if (conversationId) {
      const messageContent = `🎁 ${senderProfile?.username || "Người dùng"} đã tặng bạn ${amount.toLocaleString()} ${body.token_symbol}!\n\n${body.message ? `"${body.message}"\n\n` : ""}💰 TX: ${body.tx_hash.slice(0, 18)}...\n\n👉 Nhấn "Xem Card Chúc Mừng" để xem chi tiết!`;

      const { data: message } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: body.sender_id,
          content: messageContent,
          media_urls: JSON.stringify([{
            type: "donation",
            donation_id: donation.id,
            amount: body.amount,
            token_symbol: body.token_symbol,
            tx_hash: body.tx_hash,
          }]),
        })
        .select("id")
        .single();

      if (message) {
        messageId = message.id;
        await supabase
          .from("donations")
          .update({ conversation_id: conversationId, message_id: messageId })
          .eq("id", donation.id);
      }
    }

    // Create gift celebration post on feed
    const { data: recipientProfileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", body.recipient_id)
      .single();

    const recipientName = recipientProfileData?.username;
    const senderName = senderProfile?.username || "Người dùng";

    if (recipientName) {
      const postContent = `🎉 @${senderName} đã trao gửi ${amount.toLocaleString()} ${body.token_symbol} cho @${recipientName} ❤️${body.message ? `\n\n"${body.message.slice(0, 120)}"` : ''}`;

      await supabase.from("posts").insert({
        user_id: body.sender_id,
        content: postContent,
        post_type: "gift_celebration",
        tx_hash: body.tx_hash,
        gift_sender_id: body.sender_id,
        gift_recipient_id: body.recipient_id,
        gift_token: body.token_symbol,
        gift_amount: body.amount,
        gift_message: body.message || null,
        is_highlighted: true,
        highlight_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        visibility: "public",
        moderation_status: "approved",
      });
    }

    // Notification
    await supabase.from("notifications").insert({
      user_id: body.recipient_id,
      actor_id: body.sender_id,
      post_id: body.post_id || null,
      type: "donation",
    });

    return new Response(
      JSON.stringify({
        success: true,
        donation: { id: donation.id, tx_hash: donation.tx_hash },
        light_score_earned: lightScoreEarned,
        conversation_id: conversationId,
        message_id: messageId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in record-donation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
