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
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DonationRequest = await req.json();

    // Validate required fields
    if (!body.sender_id || !body.recipient_id || !body.amount || !body.tx_hash) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure sender matches authenticated user
    if (body.sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Sender does not match authenticated user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate tx_hash
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

    // Calculate Light Score: 100 token = 1 Light Score
    const amount = parseFloat(body.amount);
    const lightScoreEarned = Math.floor(amount / 100);

    // Create light_action record for PPLP tracking
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
          base_reward: 50, // Base reward for donate action
          quality_score: 1.0,
          impact_score: Math.min(5.0, 1 + amount / 1000), // Impact scales with amount
          integrity_score: 1.0,
          unity_score: 80,
          light_score: lightScoreEarned * 10, // Convert to light score
          mint_status: "pending",
          mint_amount: lightScoreEarned,
        })
        .select("id")
        .single();

      if (lightAction) {
        lightActionId = lightAction.id;
      }
    }

    // Insert donation record
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
        status: "confirmed", // Assume confirmed since client waits for tx
        light_score_earned: lightScoreEarned,
        light_action_id: lightActionId,
        confirmed_at: new Date().toISOString(),
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

    // Create or find conversation between sender and recipient
    let conversationId = null;
    let messageId = null;

    // Check if direct conversation exists
    const { data: existingConv } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", body.sender_id)
      .in(
        "conversation_id",
        supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", body.recipient_id)
      );

    if (existingConv && existingConv.length > 0) {
      // Find direct conversation (not group)
      for (const conv of existingConv) {
        const { data: convData } = await supabase
          .from("conversations")
          .select("id, is_group")
          .eq("id", conv.conversation_id)
          .eq("is_group", false)
          .single();
        
        if (convData) {
          conversationId = convData.id;
          break;
        }
      }
    }

    // If no conversation, create one
    if (!conversationId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ is_group: false })
        .select("id")
        .single();

      if (newConv) {
        conversationId = newConv.id;
        // Add participants
        await supabase.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: body.sender_id, role: "member" },
          { conversation_id: conversationId, user_id: body.recipient_id, role: "member" },
        ]);
      }
    }

    // Create special donation message in chat
    if (conversationId) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", body.sender_id)
        .single();

      const messageContent = `🎁 ${senderProfile?.username || "Người dùng"} đã tặng bạn ${amount.toLocaleString()} ${body.token_symbol}${body.message ? `\n\n"${body.message}"` : ""}`;

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
        // Update donation with message reference
        await supabase
          .from("donations")
          .update({ conversation_id: conversationId, message_id: messageId })
          .eq("id", donation.id);
      }
    }

    // Create notification for recipient
    await supabase.from("notifications").insert({
      user_id: body.recipient_id,
      actor_id: body.sender_id,
      post_id: body.post_id || null,
      type: "donation",
    });

    return new Response(
      JSON.stringify({
        success: true,
        donation: {
          id: donation.id,
          tx_hash: donation.tx_hash,
        },
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
