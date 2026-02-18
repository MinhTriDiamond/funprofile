import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, Search, Download, ExternalLink,
  Users, TrendingDown, Eye, RefreshCw, Ban,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const toVN = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

const shortAddr = (addr?: string | null) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";

const truncate = (text?: string | null, len = 30) =>
  text && text.length > len ? text.slice(0, len) + "…" : (text ?? "—");

const fmt = (n: number) => n.toLocaleString("vi-VN");

const exportCSV = (rows: unknown[], filename: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0] as object);
  const csv = [
    keys.join(","),
    ...(rows as Record<string, unknown>[]).map(r =>
      keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── types ────────────────────────────────────────────────────────────────────

interface BannedUser {
  id: string;
  username: string;
  full_name: string | null;
  wallet_address: string | null;
  admin_notes: string | null;
  banned_at: string | null;
  total_claimed: number;
  claim_count: number;
  first_claim_at: string | null;
  last_claim_at: string | null;
  pending_reward: number;
}

interface OnHoldUser {
  id: string;
  username: string;
  full_name: string | null;
  wallet_address: string | null;
  signal_type: string;
  severity: number;
  signal_at: string | null;
  device_hash: string | null;
  related_count: number;
  pending_reward: number;
  signal_details: Record<string, unknown>;
}

// ── component ────────────────────────────────────────────────────────────────

interface SurveillanceTabProps {
  adminId: string;
}

const SurveillanceTab = ({ adminId }: SurveillanceTabProps) => {
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [onHold, setOnHold] = useState<OnHoldUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banning, setBanning] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ── Query 1: banned accounts ──────────────────────────────────────────
      const { data: bannedProfiles, error: e1 } = await supabase
        .from("profiles")
        .select("id, username, full_name, wallet_address, admin_notes, banned_at, pending_reward")
        .or("is_banned.eq.true,reward_status.eq.banned")
        .order("banned_at", { ascending: false });

      if (e1) throw e1;

      if (bannedProfiles && bannedProfiles.length > 0) {
        const bannedIds = bannedProfiles.map(p => p.id);

        // Get reward_claims aggregated per user
        const { data: claims } = await supabase
          .from("reward_claims")
          .select("user_id, amount, created_at")
          .in("user_id", bannedIds);

        // Aggregate in JS
        const claimMap = new Map<string, { total: number; count: number; first: string | null; last: string | null }>();
        for (const c of (claims ?? [])) {
          const prev = claimMap.get(c.user_id) ?? { total: 0, count: 0, first: null, last: null };
          const amt = Number(c.amount ?? 0);
          const dt = c.created_at;
          claimMap.set(c.user_id, {
            total: prev.total + amt,
            count: prev.count + 1,
            first: !prev.first || dt < prev.first ? dt : prev.first,
            last: !prev.last || dt > prev.last ? dt : prev.last,
          });
        }

        const enriched: BannedUser[] = bannedProfiles.map(p => {
          const agg = claimMap.get(p.id) ?? { total: 0, count: 0, first: null, last: null };
          return {
            id: p.id,
            username: p.username ?? "—",
            full_name: p.full_name,
            wallet_address: p.wallet_address,
            admin_notes: p.admin_notes,
            banned_at: p.banned_at ?? null,
            total_claimed: agg.total,
            claim_count: agg.count,
            first_claim_at: agg.first,
            last_claim_at: agg.last,
            pending_reward: Number(p.pending_reward ?? 0),
          };
        });
        enriched.sort((a, b) => b.total_claimed - a.total_claimed);
        setBanned(enriched);
      } else {
        setBanned([]);
      }

      // ── Query 2: on_hold accounts ─────────────────────────────────────────
      const { data: holdProfiles, error: e2 } = await supabase
        .from("profiles")
        .select("id, username, full_name, wallet_address, pending_reward")
        .eq("reward_status", "on_hold")
        .eq("is_banned", false);

      if (e2) throw e2;

      if (holdProfiles && holdProfiles.length > 0) {
        const holdIds = holdProfiles.map(p => p.id);

        // Get latest fraud signal per user (two-step to avoid subquery)
        const { data: signals } = await supabase
          .from("pplp_fraud_signals")
          .select("actor_id, signal_type, severity, created_at, details")
          .in("actor_id", holdIds)
          .eq("is_resolved", false)
          .order("severity", { ascending: false })
          .order("created_at", { ascending: false });

        // Keep only the most severe signal per actor
        const signalMap = new Map<string, typeof signals extends (infer T)[] ? T : never>();
        for (const s of (signals ?? [])) {
          if (!signalMap.has(s.actor_id)) signalMap.set(s.actor_id, s);
        }

        // Count related accounts per device_hash
        const deviceHashCounts = new Map<string, number>();
        for (const s of (signals ?? [])) {
          const dh = (s.details as Record<string, unknown>)?.device_hash as string | undefined;
          if (dh) deviceHashCounts.set(dh, (deviceHashCounts.get(dh) ?? 0) + 1);
        }

        const enrichedHold: OnHoldUser[] = holdProfiles.map(p => {
          const sig = signalMap.get(p.id);
          const details = (sig?.details ?? {}) as Record<string, unknown>;
          const dh = details?.device_hash as string | undefined;
          return {
            id: p.id,
            username: p.username ?? "—",
            full_name: p.full_name,
            wallet_address: p.wallet_address,
            signal_type: sig?.signal_type ?? "UNKNOWN",
            severity: sig?.severity ?? 0,
            signal_at: sig?.created_at ?? null,
            device_hash: dh ? String(dh).slice(0, 8) : null,
            related_count: dh ? (deviceHashCounts.get(dh) ?? 1) : 1,
            pending_reward: Number(p.pending_reward ?? 0),
            signal_details: details,
          };
        });
        enrichedHold.sort((a, b) => b.severity - a.severity || (b.signal_at ?? "").localeCompare(a.signal_at ?? ""));
        setOnHold(enrichedHold);
      } else {
        setOnHold([]);
      }
    } catch (err) {
      console.error("SurveillanceTab error:", err);
      toast.error("Lỗi tải dữ liệu giám sát");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBan = async (userId: string, username: string) => {
    if (!confirm(`Xác nhận BAN vĩnh viễn tài khoản ${username}?`)) return;
    setBanning(userId);
    try {
      const { error } = await supabase.rpc("ban_user_permanently", {
        p_user_id: userId,
        p_admin_id: adminId,
        p_reason: "Manual ban from Surveillance tab",
      });
      if (error) throw error;
      toast.success(`Đã ban ${username}`);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi ban tài khoản");
    } finally {
      setBanning(null);
    }
  };

  // ── filtered lists ────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredBanned = banned.filter(
    u => u.username.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)
  );
  const filteredHold = onHold.filter(
    u => u.username.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)
  );

  // ── summary numbers ───────────────────────────────────────────────────────
  const totalClaimed = banned.reduce((s, u) => s + u.total_claimed, 0);
  const riskCAMLY = onHold.reduce((s, u) => s + u.pending_reward, 0);

  // ── export handlers ───────────────────────────────────────────────────────
  const exportBanned = () =>
    exportCSV(
      filteredBanned.map(u => ({
        username: u.username, ho_ten: u.full_name ?? "", da_rut_CAMLY: u.total_claimed,
        so_lan_rut: u.claim_count, lan_rut_dau: toVN(u.first_claim_at),
        lan_rut_cuoi: toVN(u.last_claim_at), ngay_ban: toVN(u.banned_at),
        vi: u.wallet_address ?? "", ly_do: u.admin_notes ?? "",
      })),
      "banned_accounts.csv"
    );

  const exportHold = () =>
    exportCSV(
      filteredHold.map(u => ({
        username: u.username, ho_ten: u.full_name ?? "", tin_hieu: u.signal_type,
        severity: u.severity, ngay_phat_hien: toVN(u.signal_at),
        device_hash: u.device_hash ?? "", tai_khoan_lq: u.related_count,
        ton_dong: u.pending_reward, vi: u.wallet_address ?? "",
      })),
      "onhold_accounts.csv"
    );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tổng đã bị ban</p>
                  <p className="text-2xl font-bold text-destructive">{banned.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tổng đã rút (CAMLY)</p>
                  <p className="text-xl font-bold text-orange-500">{fmt(totalClaimed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Đang on_hold</p>
                  <p className="text-2xl font-bold text-yellow-500">{onHold.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-600/30 bg-yellow-600/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-600/10 rounded-lg">
                  <Shield className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CAMLY nguy cơ</p>
                  <p className="text-xl font-bold text-yellow-600">{fmt(riskCAMLY)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo username / họ tên…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {/* ── Inner tabs ────────────────────────────────────────────────── */}
        <Tabs defaultValue="banned">
          <TabsList>
            <TabsTrigger value="banned" className="gap-2">
              <Ban className="w-4 h-4" />
              Đã bị ban ({filteredBanned.length})
            </TabsTrigger>
            <TabsTrigger value="hold" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Đang theo dõi — on_hold ({filteredHold.length})
            </TabsTrigger>
          </TabsList>

          {/* ── BANNED ───────────────────────────────────────────────── */}
          <TabsContent value="banned">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="w-4 h-4 text-destructive" />
                  Tài khoản đã bị BAN
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportBanned}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Username</TableHead>
                        <TableHead>Họ tên</TableHead>
                        <TableHead className="text-right">Đã rút (CAMLY)</TableHead>
                        <TableHead className="text-right">Số lần rút</TableHead>
                        <TableHead>Lần rút đầu</TableHead>
                        <TableHead>Lần rút cuối</TableHead>
                        <TableHead>Ngày ban</TableHead>
                        <TableHead>Ví</TableHead>
                        <TableHead>Lý do / Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Đang tải…
                          </TableCell>
                        </TableRow>
                      ) : filteredBanned.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : filteredBanned.map(u => (
                        <TableRow key={u.id} className="hover:bg-destructive/5">
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">BAN</Badge>
                              <span className="font-mono text-xs font-semibold">{u.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{u.full_name ?? "—"}</TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            {u.total_claimed > 0 ? fmt(u.total_claimed) : "0"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{u.claim_count}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{toVN(u.first_claim_at)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{toVN(u.last_claim_at)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{toVN(u.banned_at)}</TableCell>
                          <TableCell>
                            {u.wallet_address ? (
                              <a
                                href={`https://bscscan.com/address/${u.wallet_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                              >
                                {shortAddr(u.wallet_address)}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {u.admin_notes && u.admin_notes.length > 30 ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-xs text-muted-foreground cursor-help">
                                    {truncate(u.admin_notes, 30)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{u.admin_notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">{u.admin_notes ?? "—"}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ON_HOLD ──────────────────────────────────────────────── */}
          <TabsContent value="hold">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-yellow-500" />
                  Tài khoản đang theo dõi (on_hold)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportHold}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Username</TableHead>
                        <TableHead>Họ tên</TableHead>
                        <TableHead>Loại tín hiệu</TableHead>
                        <TableHead className="text-center">Severity</TableHead>
                        <TableHead>Ngày phát hiện</TableHead>
                        <TableHead>Device Hash</TableHead>
                        <TableHead className="text-center">Tài khoản LQ</TableHead>
                        <TableHead className="text-right">Tồn đọng</TableHead>
                        <TableHead>Ví</TableHead>
                        <TableHead>Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            Đang tải…
                          </TableCell>
                        </TableRow>
                      ) : filteredHold.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : filteredHold.map(u => (
                        <TableRow key={u.id} className="hover:bg-yellow-500/5">
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge className="text-xs px-1.5 py-0 bg-yellow-500 text-yellow-950">HOLD</Badge>
                              <span className="font-mono text-xs font-semibold">{u.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{u.full_name ?? "—"}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs font-mono border-orange-400 text-orange-600">
                                  {u.signal_type}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">
                                  {JSON.stringify(u.signal_details, null, 2)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={u.severity >= 4 ? "destructive" : "outline"}
                              className={`text-xs ${u.severity === 3 ? "border-orange-400 text-orange-600" : ""}`}
                            >
                              {u.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{toVN(u.signal_at)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{u.device_hash ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <span className="flex items-center justify-center gap-1 text-sm">
                              <Users className="w-3 h-3" />
                              {u.related_count}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-yellow-600">
                            {u.pending_reward > 0 ? fmt(u.pending_reward) : "0"}
                          </TableCell>
                          <TableCell>
                            {u.wallet_address ? (
                              <a
                                href={`https://bscscan.com/address/${u.wallet_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                              >
                                {shortAddr(u.wallet_address)}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-7 px-2"
                              disabled={banning === u.id}
                              onClick={() => handleBan(u.id, u.username)}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              {banning === u.id ? "…" : "Ban"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default SurveillanceTab;
