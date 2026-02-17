import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Get IP from headers (Cloudflare/proxy)
    const ip = req.headers.get("cf-connecting-ip") 
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    // Read device_hash from body (optional)
    let deviceHash: string | null = null;
    try {
      const body = await req.json();
      deviceHash = body?.device_hash || null;
    } catch {
      // No body or invalid JSON - that's fine
    }

    // Insert using service role
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    await supabaseAdmin.from("login_ip_logs").insert({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
    });

    // If device_hash provided, upsert to pplp_device_registry and check for shared devices
    if (deviceHash && typeof deviceHash === "string" && deviceHash.length >= 16) {
      // Upsert device registry
      const { error: upsertErr } = await supabaseAdmin
        .from("pplp_device_registry")
        .upsert(
          { user_id: user.id, device_hash: deviceHash, last_seen: new Date().toISOString(), usage_count: 1 },
          { onConflict: "user_id,device_hash" }
        );

      if (upsertErr) {
        // If upsert fails due to no unique constraint, try insert
        if (upsertErr.code === "42P10" || upsertErr.message?.includes("unique")) {
          await supabaseAdmin.from("pplp_device_registry").insert({
            user_id: user.id,
            device_hash: deviceHash,
            last_seen: new Date().toISOString(),
          });
        } else {
          console.error("Device registry upsert error:", upsertErr);
        }
      } else {
        // Update usage_count for existing entries
        await supabaseAdmin
          .from("pplp_device_registry")
          .update({ last_seen: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("device_hash", deviceHash);
      }

      // Check if same device_hash used by other users
      const { data: otherUsers } = await supabaseAdmin
        .from("pplp_device_registry")
        .select("user_id")
        .eq("device_hash", deviceHash)
        .neq("user_id", user.id);

      // Only flag if MORE THAN 2 other users share same device (allow up to 3 total)
      if (otherUsers && otherUsers.length > 2) {
        const allUserIds = [user.id, ...otherUsers.map(u => u.user_id)];
        console.warn(`[SHARED DEVICE] device_hash=${deviceHash.slice(0, 8)}... shared by ${allUserIds.length} users`);

        // Check registration rate: how many accounts created on this device in last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentAccounts } = await supabaseAdmin
          .from("pplp_device_registry")
          .select("user_id, created_at")
          .eq("device_hash", deviceHash);

        // Get profiles created in last 24h on this device
        const recentUserIds = recentAccounts?.map(a => a.user_id) || [];
        const { data: recentProfiles } = await supabaseAdmin
          .from("profiles")
          .select("id, created_at")
          .in("id", recentUserIds)
          .gte("created_at", oneDayAgo);

        const recentCount = recentProfiles?.length || 0;
        const shouldAutoBan = recentCount > 3; // More than 3 accounts in 24h = auto-ban new ones

        if (shouldAutoBan) {
          // Auto-ban only the newest accounts (created in last 24h), not all
          const newAccountIds = recentProfiles?.map(p => p.id) || [];
          for (const uid of newAccountIds) {
            await supabaseAdmin.from("profiles").update({
              is_banned: true,
              reward_status: "banned",
              admin_notes: `Tự động cấm: ${recentCount} tài khoản tạo trên cùng thiết bị trong 24 giờ`,
            }).eq("id", uid);
          }

          // Insert high-severity fraud signal
          await supabaseAdmin.from("pplp_fraud_signals").insert({
            actor_id: user.id,
            signal_type: "RAPID_REGISTRATION",
            severity: 5,
            details: { device_hash: deviceHash.slice(0, 8), recent_count: recentCount, auto_banned: newAccountIds },
            source: "log-login-ip",
          });
        } else {
          // Standard shared device handling: put on hold
          const holdMessage = `Hệ thống nhận thấy thiết bị này được dùng bởi ${allUserIds.length} tài khoản. Để bảo vệ quyền lợi mọi người, tài khoản chờ Admin xác minh 🙏`;
          
          for (const uid of allUserIds) {
            await supabaseAdmin.from("profiles").update({
              reward_status: "on_hold",
              admin_notes: holdMessage,
            }).eq("id", uid);
          }
        }

        // Flag device
        await supabaseAdmin.from("pplp_device_registry").update({
          is_flagged: true,
          flag_reason: `Cùng thiết bị với ${allUserIds.length} tài khoản`,
        }).eq("device_hash", deviceHash);

        // Insert integrity signal
        await supabaseAdmin.from("pplp_fraud_signals").insert({
          actor_id: user.id,
          signal_type: "SHARED_DEVICE",
          severity: 3,
          details: { device_hash: deviceHash.slice(0, 8), all_user_ids: allUserIds },
          source: "log-login-ip",
        });

        // Notify all admins
        const { data: admins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (admins && admins.length > 0) {
          const notifications = admins.map(a => ({
            user_id: a.user_id,
            actor_id: user.id,
            type: "admin_shared_device",
            read: false,
          }));
          await supabaseAdmin.from("notifications").insert(notifications);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("log-login-ip error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
