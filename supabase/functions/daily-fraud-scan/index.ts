import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Extract email prefix (strip trailing digits before @) for farm detection */
function getEmailBase(email: string): string {
  const local = email.split('@')[0] || '';
  return local.replace(/\./g, '').replace(/\d+$/, '').toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const alerts: string[] = [];

    // 1. Shared device detection: devices with >2 users
    const { data: flaggedDevices } = await supabase
      .from("pplp_device_registry")
      .select("device_hash, user_id")
      .eq("is_flagged", false);

    if (flaggedDevices) {
      const deviceMap = new Map<string, string[]>();
      for (const d of flaggedDevices) {
        const users = deviceMap.get(d.device_hash) || [];
        users.push(d.user_id);
        deviceMap.set(d.device_hash, users);
      }

      for (const [hash, users] of deviceMap) {
        if (users.length > 2) {
          alerts.push(`Thiết bị ${hash.slice(0, 8)}... có ${users.length} tài khoản`);

          // Check if signal already exists today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("pplp_fraud_signals")
            .select("id")
            .eq("signal_type", "SHARED_DEVICE")
            .eq("source", "daily-fraud-scan")
            .gte("created_at", today.toISOString())
            .in("actor_id", users)
            .limit(1);

          if (!existing?.length) {
            await supabase.from("pplp_fraud_signals").insert({
              actor_id: users[0],
              signal_type: "SHARED_DEVICE",
              severity: 3,
              details: { device_hash: hash.slice(0, 8), user_count: users.length, user_ids: users },
              source: "daily-fraud-scan",
            });
          }
        }
      }
    }

    // 2. Email farm detection
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (!authErr && authUsers?.users) {
      const emailGroups = new Map<string, Array<{ id: string; email: string }>>();
      for (const u of authUsers.users) {
        if (!u.email) continue;
        const base = getEmailBase(u.email);
        if (base.length < 3) continue;
        const domain = u.email.split('@')[1] || '';
        const key = `${base}@${domain}`;
        const group = emailGroups.get(key) || [];
        group.push({ id: u.id, email: u.email });
        emailGroups.set(key, group);
      }

      for (const [key, users] of emailGroups) {
        if (users.length >= 3) {
          alerts.push(`Cụm email "${key.split('@')[0]}" có ${users.length} tài khoản`);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("pplp_fraud_signals")
            .select("id")
            .eq("signal_type", "EMAIL_FARM")
            .eq("source", "daily-fraud-scan")
            .gte("created_at", today.toISOString())
            .limit(1);

          if (!existing?.length) {
            await supabase.from("pplp_fraud_signals").insert({
              actor_id: users[0].id,
              signal_type: "EMAIL_FARM",
              severity: 4,
              details: { email_base: key.split('@')[0], count: users.length, emails: users.map(u => u.email) },
              source: "daily-fraud-scan",
            });
          }
        }
      }
    }

    // 3. IP clustering: multiple accounts from same IP in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogins } = await supabase
      .from("login_ip_logs")
      .select("ip_address, user_id")
      .gte("created_at", oneDayAgo);

    if (recentLogins) {
      const ipMap = new Map<string, Set<string>>();
      for (const log of recentLogins) {
        if (log.ip_address === "unknown") continue;
        const users = ipMap.get(log.ip_address) || new Set();
        users.add(log.user_id);
        ipMap.set(log.ip_address, users);
      }

      for (const [ip, users] of ipMap) {
        if (users.size > 3) {
          const userArr = Array.from(users);
          alerts.push(`IP ${ip} có ${users.size} tài khoản đăng nhập trong 24h`);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("pplp_fraud_signals")
            .select("id")
            .eq("signal_type", "IP_CLUSTER")
            .eq("source", "daily-fraud-scan")
            .gte("created_at", today.toISOString())
            .limit(1);

          if (!existing?.length) {
            await supabase.from("pplp_fraud_signals").insert({
              actor_id: userArr[0],
              signal_type: "IP_CLUSTER",
              severity: 3,
              details: { ip_address: ip, user_count: users.size, user_ids: userArr },
              source: "daily-fraud-scan",
            });
          }
        }
      }
    }

    // 4. Notify admins if any alerts found
    if (alerts.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins?.length) {
        // Use first admin as actor_id (system notification)
        const systemActorId = admins[0].user_id;

        await supabase.from("notifications").insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            actor_id: systemActorId,
            type: "admin_fraud_daily",
            read: false,
          }))
        );

        console.log(`[Daily Fraud Scan] Sent ${alerts.length} alerts to ${admins.length} admins`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alerts_count: alerts.length,
      alerts,
      scanned_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Daily Fraud Scan] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
