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

/** Email farm allowlist - verified admin clusters */
const EMAIL_FARM_ALLOWLIST = ['hoangtydo'];

/** Lookup usernames from profiles table */
async function lookupUsernames(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const uniqueIds = [...new Set(userIds)];
  // Batch in chunks of 100
  for (let i = 0; i < uniqueIds.length; i += 100) {
    const chunk = uniqueIds.slice(i, i + 100);
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", chunk);
    if (data) {
      for (const p of data) {
        map.set(p.id, p.username || p.id.slice(0, 8));
      }
    }
  }
  return map;
}

/** Build userId -> email map from auth users list */
function buildEmailMap(authUsers: Array<{ id: string; email?: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const u of authUsers) {
    if (u.email) map.set(u.id, u.email);
  }
  return map;
}

/** Format username with email: "username (email)" */
function formatUserWithEmail(userId: string, usernameMap: Map<string, string>, emailMap: Map<string, string>): string {
  const name = usernameMap.get(userId) || userId.slice(0, 8);
  const email = emailMap.get(userId);
  return email ? `${name} (${email})` : name;
}

/** Auto-hold users, excluding admins and already banned/on_hold */
async function autoHoldUsers(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  adminIds: Set<string>,
  reason: string,
): Promise<number> {
  const toHold = userIds.filter(id => !adminIds.has(id));
  if (toHold.length === 0) return 0;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      reward_status: "on_hold",
      admin_notes: `${reason} Tự động đình chỉ bởi hệ thống quét hàng ngày ${new Date().toISOString().split('T')[0]}.`,
    })
    .in("id", toHold)
    .not("reward_status", "in", '("banned","on_hold")')
    .select("id");

  if (error) {
    console.error("[Daily Fraud Scan] Auto-hold error:", error);
    return 0;
  }
  return data?.length || 0;
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
    let totalHeld = 0;
    const allFlaggedUserIds: string[] = [];

    // Pre-fetch admin IDs to exclude from auto-hold
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = new Set((adminRoles || []).map((r: { user_id: string }) => r.user_id));

    // 1. Shared device detection: devices with >2 users
    // Only scan v2+ fingerprints (v1 is unreliable and causes false positives)
    const { data: flaggedDevices } = await supabase
      .from("pplp_device_registry")
      .select("device_hash, user_id")
      .eq("is_flagged", false)
      .gte("fingerprint_version", 2);

    // Collect device clusters for username enrichment
    const deviceClusters: Array<{ hash: string; users: string[] }> = [];

    if (flaggedDevices) {
      const deviceMap = new Map<string, string[]>();
      for (const d of flaggedDevices) {
        const users = deviceMap.get(d.device_hash) || [];
        users.push(d.user_id);
        deviceMap.set(d.device_hash, users);
      }

      for (const [hash, users] of deviceMap) {
        if (users.length > 2) {
          allFlaggedUserIds.push(...users);
          deviceClusters.push({ hash, users });

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

          const held = await autoHoldUsers(
            supabase, users, adminIds,
            `Thiết bị ${hash.slice(0, 8)} dùng chung ${users.length} tài khoản.`,
          );
          totalHeld += held;
        }
      }
    }

    // 2. Email farm detection
    const emailClusters: Array<{ emailBase: string; users: Array<{ id: string; email: string }> }> = [];
    let globalEmailMap = new Map<string, string>();
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (!authErr && authUsers?.users) {
      // Build global email map for all users
      globalEmailMap = buildEmailMap(authUsers.users as Array<{ id: string; email?: string }>);
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
          const emailBase = key.split('@')[0];

          if (EMAIL_FARM_ALLOWLIST.some(allowed => emailBase.startsWith(allowed))) {
            console.log(`[Daily Fraud Scan] Skipping allowlisted email cluster: ${emailBase}`);
            continue;
          }

          allFlaggedUserIds.push(...users.map(u => u.id));
          emailClusters.push({ emailBase, users });

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
              details: { email_base: emailBase, count: users.length, emails: users.map(u => u.email) },
              source: "daily-fraud-scan",
            });
          }

          const userIds = users.map(u => u.id);
          const held = await autoHoldUsers(
            supabase, userIds, adminIds,
            `Email farm: cụm "${emailBase}" có ${users.length} tài khoản.`,
          );
          totalHeld += held;
        }
      }
    }

    // 3. IP clustering + device cross-check to avoid false positives
    const ipClusters: Array<{ ip: string; sharedDeviceUsers: string[]; uniqueDeviceUsers: string[] }> = [];
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

          // Cross-check: query device_hash (v2+) for all users in this IP cluster
          const { data: deviceData } = await supabase
            .from("pplp_device_registry")
            .select("user_id, device_hash")
            .in("user_id", userArr)
            .gte("fingerprint_version", 2);

          // Build device_hash -> user_ids map
          const deviceToUsers = new Map<string, string[]>();
          const usersWithDevice = new Set<string>();
          if (deviceData) {
            for (const d of deviceData) {
              usersWithDevice.add(d.user_id);
              const list = deviceToUsers.get(d.device_hash) || [];
              list.push(d.user_id);
              deviceToUsers.set(d.device_hash, list);
            }
          }

          // Shared device users: users who share a device_hash with another user in this IP
          const sharedDeviceUserSet = new Set<string>();
          for (const [, deviceUsers] of deviceToUsers) {
            if (deviceUsers.length > 1) {
              for (const uid of deviceUsers) sharedDeviceUserSet.add(uid);
            }
          }
          const sharedDeviceUsers = Array.from(sharedDeviceUserSet);

          // Unique device users: everyone else (unique device OR no device data)
          const uniqueDeviceUsers = userArr.filter(id => !sharedDeviceUserSet.has(id));

          allFlaggedUserIds.push(...userArr);
          ipClusters.push({ ip, sharedDeviceUsers, uniqueDeviceUsers });

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (sharedDeviceUsers.length > 0) {
            // High severity: same IP + same device = definite fraud
            const { data: existing } = await supabase
              .from("pplp_fraud_signals")
              .select("id")
              .eq("signal_type", "IP_DEVICE_CLUSTER")
              .eq("source", "daily-fraud-scan")
              .gte("created_at", today.toISOString())
              .in("actor_id", sharedDeviceUsers)
              .limit(1);

            if (!existing?.length) {
              await supabase.from("pplp_fraud_signals").insert({
                actor_id: sharedDeviceUsers[0],
                signal_type: "IP_DEVICE_CLUSTER",
                severity: 4,
                details: { ip_address: ip, shared_device_users: sharedDeviceUsers, unique_device_users: uniqueDeviceUsers },
                source: "daily-fraud-scan",
              });
            }

            const held = await autoHoldUsers(
              supabase, sharedDeviceUsers, adminIds,
              `IP ${ip} + cùng thiết bị: ${sharedDeviceUsers.length} TK chung device.`,
            );
            totalHeld += held;
          }

          if (uniqueDeviceUsers.length > 0 && sharedDeviceUsers.length === 0) {
            // Same IP but all different devices - still auto-hold for safety
            const { data: existing } = await supabase
              .from("pplp_fraud_signals")
              .select("id")
              .eq("signal_type", "IP_CLUSTER")
              .eq("source", "daily-fraud-scan")
              .gte("created_at", today.toISOString())
              .limit(1);

            if (!existing?.length) {
              await supabase.from("pplp_fraud_signals").insert({
                actor_id: uniqueDeviceUsers[0],
                signal_type: "IP_CLUSTER",
                severity: 2,
                details: { ip_address: ip, user_count: users.size, user_ids: userArr, note: "Khác thiết bị - đình chỉ để kiểm tra" },
                source: "daily-fraud-scan",
              });
            }

            const held = await autoHoldUsers(
              supabase, uniqueDeviceUsers, adminIds,
              `IP ${ip} có ${users.size} TK khác thiết bị - đình chỉ để xác minh.`,
            );
            totalHeld += held;
          }
        }
      }
    }

    // 4. Lookup usernames for all flagged users and build enriched alerts
    const usernameMap = await lookupUsernames(supabase, allFlaggedUserIds);
    const allFlaggedUsernames: string[] = [...new Set(allFlaggedUserIds)].map(
      id => usernameMap.get(id) || id.slice(0, 8)
    );

    // Build flagged_emails map: username -> email
    const flaggedEmails: Record<string, string> = {};
    for (const uid of new Set(allFlaggedUserIds)) {
      const uname = usernameMap.get(uid) || uid.slice(0, 8);
      const email = globalEmailMap.get(uid);
      if (email) flaggedEmails[uname] = email;
    }

    // Build enriched alert strings with usernames + emails
    for (const { hash, users } of deviceClusters) {
      const names = users.map(id => formatUserWithEmail(id, usernameMap, globalEmailMap)).join(', ');
      alerts.push(`Thiết bị ${hash.slice(0, 8)}... có ${users.length} TK: ${names}`);
    }
    for (const { emailBase, users } of emailClusters) {
      const names = users.map(u => formatUserWithEmail(u.id, usernameMap, globalEmailMap)).join(', ');
      alerts.push(`Cụm email "${emailBase}" có ${users.length} TK: ${names}`);
    }
    for (const { ip, sharedDeviceUsers, uniqueDeviceUsers } of ipClusters) {
      const parts: string[] = [];
      if (sharedDeviceUsers.length > 0) {
        const names = sharedDeviceUsers.map(id => formatUserWithEmail(id, usernameMap, globalEmailMap)).join(', ');
        parts.push(`${sharedDeviceUsers.length} TK chung thiết bị (đã đình chỉ): ${names}`);
      }
      if (uniqueDeviceUsers.length > 0) {
        const names = uniqueDeviceUsers.map(id => formatUserWithEmail(id, usernameMap, globalEmailMap)).join(', ');
        parts.push(`${uniqueDeviceUsers.length} TK thiết bị riêng (chỉ cảnh báo): ${names}`);
      }
      alerts.push(`IP ${ip}: ${parts.join(' | ')}`);
    }

    // 5. Notify admins if any alerts found
    if (alerts.length > 0) {
      const admins = Array.from(adminIds);

      if (admins.length) {
        const systemActorId = admins[0];

        await supabase.from("notifications").insert(
          admins.map((userId: string) => ({
            user_id: userId,
            actor_id: systemActorId,
            type: "admin_fraud_daily",
            read: false,
            metadata: {
              alerts_count: alerts.length,
              alerts: alerts.slice(0, 10),
              accounts_held: totalHeld,
              flagged_usernames: allFlaggedUsernames.slice(0, 50),
              flagged_emails: flaggedEmails,
            },
          }))
        );

        console.log(`[Daily Fraud Scan] Sent ${alerts.length} alerts to ${admins.length} admins. Auto-held ${totalHeld} accounts.`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alerts_count: alerts.length,
      accounts_held: totalHeld,
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
