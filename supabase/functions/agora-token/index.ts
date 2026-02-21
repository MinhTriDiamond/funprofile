import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }
    const userId = user.id;

    const body = await req.json();
    const channelName = body.channelName || body.channel_name;
    const callType = body.callType || body.call_type;
    if (!channelName) {
      return new Response(JSON.stringify({ error: "channelName required" }), { status: 400, headers: corsHeaders });
    }

    // Verify user is a participant of the call session
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session } = await supabaseAdmin
      .from("call_sessions")
      .select("id, conversation_id")
      .eq("channel_name", channelName)
      .in("status", ["ringing", "active"])
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "No active call session" }), { status: 404, headers: corsHeaders });
    }

    // Check participant
    const { data: participant } = await supabaseAdmin
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", session.conversation_id)
      .eq("user_id", userId)
      .is("left_at", null)
      .maybeSingle();

    if (!participant) {
      return new Response(JSON.stringify({ error: "Not a participant" }), { status: 403, headers: corsHeaders });
    }

    // Call Cloudflare Worker for Agora token
    const workerUrl = Deno.env.get("AGORA_WORKER_URL");
    const workerApiKey = Deno.env.get("AGORA_WORKER_API_KEY");

    if (!workerUrl || !workerApiKey) {
      return new Response(JSON.stringify({ error: "Agora not configured" }), { status: 500, headers: corsHeaders });
    }

    const tokenResp = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": workerApiKey,
      },
      body: JSON.stringify({
        channelName,
        uid: userId,
        role: "publisher",
      }),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      console.error("Agora worker error:", tokenResp.status, text);
      return new Response(JSON.stringify({ error: "Failed to get token" }), { status: 500, headers: corsHeaders });
    }

    const tokenData = await tokenResp.json();
    return new Response(JSON.stringify(tokenData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("agora-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
