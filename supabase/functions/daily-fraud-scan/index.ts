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
const EMAIL_FARM_ALLOWLIST = ['hoangtydo', 'bongsieuoi'];

/** Lookup usernames from profiles table */
async function lookupUsernames(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const uniqueIds = [...new Set(userIds)];
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

/** Auto-hold users for CLAIM FARM only, excluding admins and already banned/on_hold/approved */
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
    .not("reward_status", "in", '("banned","on_hold","approved")')
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

    // 1. Shared device detection: devices with >2 users — CHỈ GHI LOG, KHÔNG HOLD
    const { data: flaggedDevices } = await supabase
      .from("pplp_device_registry")
      .select("device_hash, user_id")
      .eq("is_flagged", false)
      .gte("fingerprint_version", 2);

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
              severity: 2, // Giảm severity — chỉ cảnh báo
              details: { device_hash: hash.slice(0, 8), user_count: users.length, user_ids: users, note: "Chỉ cảnh báo - không tự động đình chỉ" },
              source: "daily-fraud-scan",
            });
          }
          // KHÔNG auto-hold — shared device có thể là cùng model điện thoại
        }
      }
    }

    // 2. Email farm detection — CHỈ GHI LOG, KHÔNG HOLD
    const emailClusters: Array<{ emailBase: string; users: Array<{ id: string; email: string }> }> = [];
    let globalEmailMap = new Map<string, string>();
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (!authErr && authUsers?.users) {
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
              severity: 3, // Giảm severity — chỉ cảnh báo
              details: { email_base: emailBase, count: users.length, emails: users.map(u => u.email), note: "Chỉ cảnh báo - không tự động đình chỉ" },
              source: "daily-fraud-scan",
            });
          }
          // KHÔNG auto-hold — email farm có thể là gia đình/tổ chức
        }
      }
    }

    // 3. IP clustering — CHỈ GHI LOG, KHÔNG HOLD
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
        if (users.size > 5) {
          const userArr = Array.from(users);

          const { data: deviceData } = await supabase
            .from("pplp_device_registry")
            .select("user_id, device_hash")
            .in("user_id", userArr)
            .gte("fingerprint_version", 2);

          const deviceToUsers = new Map<string, string[]>();
          if (deviceData) {
            for (const d of deviceData) {
              const list = deviceToUsers.get(d.device_hash) || [];
              list.push(d.user_id);
              deviceToUsers.set(d.device_hash, list);
            }
          }

          const sharedDeviceUserSet = new Set<string>();
          for (const [, deviceUsers] of deviceToUsers) {
            if (deviceUsers.length > 1) {
              for (const uid of deviceUsers) sharedDeviceUserSet.add(uid);
            }
          }
          const sharedDeviceUsers = Array.from(sharedDeviceUserSet);
          const uniqueDeviceUsers = userArr.filter(id => !sharedDeviceUserSet.has(id));

          allFlaggedUserIds.push(...userArr);
          ipClusters.push({ ip, sharedDeviceUsers, uniqueDeviceUsers });

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Tất cả IP clusters — chỉ ghi signal cảnh báo, KHÔNG auto-hold
          const signalType = sharedDeviceUsers.length > 0 ? "IP_DEVICE_CLUSTER" : "IP_CLUSTER";
          const severity = sharedDeviceUsers.length > 0 ? 3 : 1;

          const { data: existing } = await supabase
            .from("pplp_fraud_signals")
            .select("id")
            .eq("signal_type", signalType)
            .eq("source", "daily-fraud-scan")
            .gte("created_at", today.toISOString())
            .limit(1);

          if (!existing?.length) {
            await supabase.from("pplp_fraud_signals").insert({
              actor_id: userArr[0],
              signal_type: signalType,
              severity,
              details: {
                ip_address: ip,
                user_count: users.size,
                shared_device_users: sharedDeviceUsers,
                unique_device_users: uniqueDeviceUsers,
                note: "Chỉ cảnh báo - không tự động đình chỉ. Hệ thống chỉ hold khi phát hiện claim farm.",
              },
              source: "daily-fraud-scan",
            });
          }
          // KHÔNG auto-hold — cùng WiFi/IP tại sự kiện cộng đồng là bình thường
        }
      }
    }

    // 4. === MỚI: CLAIM FARM DETECTION — Phát hiện farm dựa trên hành vi claim ===
    // Chỉ tự động hold khi phát hiện nhiều TK claim đồng bộ từ cùng IP/device
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Get all claims in last hour
    const { data: recentClaims } = await supabase
      .from("pending_claims")
      .select("user_id, amount, created_at, wallet_address")
      .gte("created_at", oneHourAgo);

    const { data: recentRewardClaims } = await supabase
      .from("reward_claims")
      .select("user_id, amount, created_at")
      .gte("created_at", oneHourAgo);

    const allRecentClaims = [
      ...(recentClaims || []).map(c => ({ user_id: c.user_id, amount: Number(c.amount), created_at: c.created_at })),
      ...(recentRewardClaims || []).map(c => ({ user_id: c.user_id, amount: Number(c.amount), created_at: c.created_at })),
    ];

    if (allRecentClaims.length >= 5) {
      // Get claim user IPs from login logs
      const claimUserIds = [...new Set(allRecentClaims.map(c => c.user_id))];
      
      const { data: claimUserIps } = await supabase
        .from("login_ip_logs")
        .select("user_id, ip_address")
        .in("user_id", claimUserIds)
        .gte("created_at", oneDayAgo);

      // Group by IP
      const ipToClaimUsers = new Map<string, Set<string>>();
      if (claimUserIps) {
        for (const log of claimUserIps) {
          if (log.ip_address === "unknown") continue;
          const set = ipToClaimUsers.get(log.ip_address) || new Set();
          set.add(log.user_id);
          ipToClaimUsers.set(log.ip_address, set);
        }
      }

      // Also group by device hash
      const { data: claimDevices } = await supabase
        .from("pplp_device_registry")
        .select("user_id, device_hash")
        .in("user_id", claimUserIds)
        .gte("fingerprint_version", 2);

      const deviceToClaimUsers = new Map<string, Set<string>>();
      if (claimDevices) {
        for (const d of claimDevices) {
          const set = deviceToClaimUsers.get(d.device_hash) || new Set();
          set.add(d.user_id);
          deviceToClaimUsers.set(d.device_hash, set);
        }
      }

      // Merge IP and device clusters
      const claimClusters: Array<{ type: string; key: string; users: string[] }> = [];

      for (const [ip, userSet] of ipToClaimUsers) {
        if (userSet.size >= 5) {
          claimClusters.push({ type: "ip", key: ip, users: Array.from(userSet) });
        }
      }
      for (const [hash, userSet] of deviceToClaimUsers) {
        if (userSet.size >= 5) {
          claimClusters.push({ type: "device", key: hash, users: Array.from(userSet) });
        }
      }

      const DAILY_CLAIM_CAP = 500000;

      for (const cluster of claimClusters) {
        // Filter to only users who actually claimed in this hour
        const clusterClaims = allRecentClaims.filter(c => cluster.users.includes(c.user_id));
        if (clusterClaims.length < 5) continue;

        // Check: ≥60% claim max amount
        const maxClaimCount = clusterClaims.filter(c => c.amount >= DAILY_CLAIM_CAP * 0.8).length;
        const maxClaimRatio = clusterClaims.length > 0 ? maxClaimCount / clusterClaims.length : 0;

        // Check: synchronized timing (most claims within 5 min of each other)
        const timestamps = clusterClaims.map(c => new Date(c.created_at).getTime()).sort();
        let syncPairs = 0;
        for (let i = 1; i < timestamps.length; i++) {
          if (timestamps[i] - timestamps[i - 1] < 5 * 60 * 1000) syncPairs++;
        }
        const syncRatio = timestamps.length > 1 ? syncPairs / (timestamps.length - 1) : 0;

        // TRIGGER: ≥5 users + ≥60% max claim + ≥50% synchronized
        if (maxClaimRatio >= 0.6 && syncRatio >= 0.5) {
          console.warn(`[CLAIM FARM] ${cluster.type}=${cluster.key.slice(0, 8)}: ${cluster.users.length} users, maxRatio=${maxClaimRatio}, syncRatio=${syncRatio}`);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("pplp_fraud_signals")
            .select("id")
            .eq("signal_type", "CLAIM_FARM")
            .eq("source", "daily-fraud-scan")
            .gte("created_at", today.toISOString())
            .limit(1);

          if (!existing?.length) {
            await supabase.from("pplp_fraud_signals").insert({
              actor_id: cluster.users[0],
              signal_type: "CLAIM_FARM",
              severity: 5,
              details: {
                cluster_type: cluster.type,
                cluster_key: cluster.key.slice(0, 8),
                user_ids: cluster.users,
                claim_count: clusterClaims.length,
                max_claim_ratio: maxClaimRatio,
                sync_ratio: syncRatio,
                note: "Farm claim đồng bộ - tự động đình chỉ",
              },
              source: "daily-fraud-scan",
            });
          }

          // AUTO-HOLD cho claim farm — đây là hành vi gian lận thực sự
          const held = await autoHoldUsers(
            supabase, cluster.users, adminIds,
            `CLAIM FARM: ${cluster.users.length} TK claim đồng bộ từ cùng ${cluster.type} (${cluster.key.slice(0, 8)}), tỷ lệ max: ${Math.round(maxClaimRatio * 100)}%, đồng bộ: ${Math.round(syncRatio * 100)}%.`,
          );
          totalHeld += held;

          allFlaggedUserIds.push(...cluster.users);
          alerts.push(`🚨 CLAIM FARM (${cluster.type}=${cluster.key.slice(0, 8)}): ${cluster.users.length} TK claim đồng bộ, max=${Math.round(maxClaimRatio * 100)}%, sync=${Math.round(syncRatio * 100)}%`);
        }
      }
    }

    // 5. Lookup usernames for all flagged users and build enriched alerts
    const usernameMap = await lookupUsernames(supabase, allFlaggedUserIds);
    const allFlaggedUsernames: string[] = [...new Set(allFlaggedUserIds)].map(
      id => usernameMap.get(id) || id.slice(0, 8)
    );

    const flaggedEmails: Record<string, string> = {};
    for (const uid of new Set(allFlaggedUserIds)) {
      const uname = usernameMap.get(uid) || uid.slice(0, 8);
      const email = globalEmailMap.get(uid);
      if (email) flaggedEmails[uname] = email;
    }

    // Build enriched alert strings
    for (const { hash, users } of deviceClusters) {
      const names = users.map(id => formatUserWithEmail(id, usernameMap, globalEmailMap)).join(', ');
      alerts.push(`⚠️ Thiết bị ${hash.slice(0, 8)}... có ${users.length} TK (chỉ cảnh báo): ${names}`);
    }
    for (const { emailBase, users } of emailClusters) {
      const names = users.map(u => formatUserWithEmail(u.id, usernameMap, globalEmailMap)).join(', ');
      alerts.push(`⚠️ Cụm email "${emailBase}" có ${users.length} TK (chỉ cảnh báo): ${names}`);
    }
    for (const { ip, sharedDeviceUsers, uniqueDeviceUsers } of ipClusters) {
      const parts: string[] = [];
      if (sharedDeviceUsers.length > 0) {
        const names = sharedDeviceUsers.map(id => formatUserWithEmail(id, usernameMap, globalEmailMap)).join(', ');
        parts.push(`${sharedDeviceUsers.length} TK chung thiết bị (chỉ cảnh báo): ${names}`);
      }
      if (uniqueDeviceUsers.length > 0) {
        const names = uniqueDeviceUsers.map(id => formatUserWithEmail(id, usernameMap, globalEmailMap)).join(', ');
        parts.push(`${uniqueDeviceUsers.length} TK thiết bị riêng (chỉ cảnh báo): ${names}`);
      }
      alerts.push(`⚠️ IP ${ip}: ${parts.join(' | ')}`);
    }

    // 6. Notify admins if any alerts found
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
              note: "Chỉ auto-hold khi phát hiện CLAIM FARM. Các cảnh báo khác chỉ để theo dõi.",
            },
          }))
        );

        console.log(`[Daily Fraud Scan] Sent ${alerts.length} alerts to ${admins.length} admins. Auto-held ${totalHeld} accounts (claim farm only).`);
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
