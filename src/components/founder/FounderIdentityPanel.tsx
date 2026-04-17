import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Fingerprint, ShieldCheck, Award, Scale, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DID_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;
const TIERS = ['T0', 'T1', 'T2', 'T3', 'T4'] as const;
const SYBIL_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

const tierColor: Record<string, string> = {
  T0: 'bg-muted text-muted-foreground',
  T1: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  T2: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  T3: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  T4: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const sybilColor: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export default function FounderIdentityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-identity-panel'],
    staleTime: 60_000,
    queryFn: async () => {
      const sb = supabase as any;
      const [dids, trusts, sbts, disputes, recoveries] = await Promise.all([
        sb.from('did_registry').select('did_level, status, entity_type, created_at'),
        sb.from('trust_profile').select('trust_tier, sybil_risk, tc'),
        sb.from('sbt_registry').select('category, status'),
        sb.from('identity_disputes').select('status, dispute_type'),
        sb.from('identity_recovery_log').select('status, created_at'),
      ]);

      const didRows = (dids.data || []) as any[];
      const trustRows = (trusts.data || []) as any[];
      const sbtRows = (sbts.data || []) as any[];
      const disputeRows = (disputes.data || []) as any[];
      const recoveryRows = (recoveries.data || []) as any[];

      const byLevel: Record<string, number> = {};
      DID_LEVELS.forEach((l) => (byLevel[l] = 0));
      didRows.forEach((d) => {
        if (byLevel[d.did_level] !== undefined) byLevel[d.did_level]++;
      });

      const byEntity: Record<string, number> = {};
      didRows.forEach((d) => {
        byEntity[d.entity_type] = (byEntity[d.entity_type] || 0) + 1;
      });

      const byTier: Record<string, number> = {};
      TIERS.forEach((t) => (byTier[t] = 0));
      trustRows.forEach((t) => {
        if (byTier[t.trust_tier] !== undefined) byTier[t.trust_tier]++;
      });

      const bySybil: Record<string, number> = {};
      SYBIL_LEVELS.forEach((s) => (bySybil[s] = 0));
      trustRows.forEach((t) => {
        if (bySybil[t.sybil_risk] !== undefined) bySybil[t.sybil_risk]++;
      });

      const sbtByCategory: Record<string, number> = {};
      sbtRows
        .filter((s) => s.status === 'active')
        .forEach((s) => {
          sbtByCategory[s.category] = (sbtByCategory[s.category] || 0) + 1;
        });

      const disputePending = disputeRows.filter((d) => d.status === 'pending' || d.status === 'investigating').length;
      const recoveryActive = recoveryRows.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;

      const avgTC = trustRows.length
        ? trustRows.reduce((s, t) => s + Number(t.tc || 0), 0) / trustRows.length
        : 0;

      const now = Date.now();
      const last7d = didRows.filter((d) => d.created_at && new Date(d.created_at).getTime() > now - 7 * 86400000).length;

      return {
        totalDIDs: didRows.length,
        byLevel,
        byEntity,
        byTier,
        bySybil,
        sbtByCategory,
        totalSBTs: sbtRows.filter((s) => s.status === 'active').length,
        disputePending,
        recoveryActive,
        avgTC,
        newDIDs7d: last7d,
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="flex justify-center p-8">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const d = data!;
  const maxLevel = Math.max(1, ...Object.values(d.byLevel));
  const maxTier = Math.max(1, ...Object.values(d.byTier));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" /> Identity & Trust System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Fingerprint} label="Tổng DID" value={d.totalDIDs.toLocaleString()} sub={`+${d.newDIDs7d} (7d)`} color="text-primary" />
          <Stat icon={ShieldCheck} label="TC trung bình" value={d.avgTC.toFixed(2)} sub="0 → 1" color="text-emerald-500" />
          <Stat icon={Award} label="SBT đang hoạt động" value={d.totalSBTs.toLocaleString()} sub={`${Object.keys(d.sbtByCategory).length} danh mục`} color="text-amber-500" />
          <Stat icon={Scale} label="Hàng đợi xử lý" value={`${d.disputePending} / ${d.recoveryActive}`} sub="Khiếu nại / Recovery" color="text-orange-500" />
        </div>

        {/* DID Level Distribution */}
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Fingerprint className="h-4 w-4" /> Phân bố DID theo cấp độ
          </p>
          <div className="space-y-1.5">
            {DID_LEVELS.map((lvl) => {
              const v = d.byLevel[lvl];
              const pct = (v / maxLevel) * 100;
              return (
                <div key={lvl} className="flex items-center gap-3 text-sm">
                  <span className="w-8 font-mono text-muted-foreground">{lvl}</span>
                  <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right font-medium tabular-nums">{v}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust Tier */}
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Phân bố Trust Tier
          </p>
          <div className="space-y-1.5">
            {TIERS.map((t) => {
              const v = d.byTier[t];
              const pct = (v / maxTier) * 100;
              return (
                <div key={t} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className={`w-10 justify-center ${tierColor[t]}`}>{t}</Badge>
                  <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500/60 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right font-medium tabular-nums">{v}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sybil Risk + Entity Type side-by-side */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Sybil Risk
            </p>
            <div className="space-y-1.5">
              {SYBIL_LEVELS.map((s) => (
                <div key={s} className="flex justify-between items-center text-sm">
                  <Badge variant="outline" className={`capitalize ${sybilColor[s]}`}>{s}</Badge>
                  <span className="font-medium tabular-nums">{d.bySybil[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" /> Top SBT Categories
            </p>
            <div className="space-y-1.5">
              {Object.entries(d.sbtByCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cat, count]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{cat.replace(/_/g, ' ')}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              {Object.keys(d.sbtByCategory).length === 0 && (
                <p className="text-xs text-muted-foreground italic">Chưa có SBT nào được phát hành</p>
              )}
            </div>
          </div>
        </div>

        {/* Entity Type */}
        <div>
          <p className="text-sm font-semibold mb-2">DID theo loại entity</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(d.byEntity).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="gap-1.5">
                <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="font-mono">{count}</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="rounded-lg border bg-background p-3 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
