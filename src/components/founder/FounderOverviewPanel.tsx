import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sun, Coins, Users, CheckCircle } from 'lucide-react';

export default function FounderOverviewPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-overview'],
    queryFn: async () => {
      const [validations, mintRecords, actions, profiles] = await Promise.all([
        supabase.from('pplp_v2_validations').select('final_light_score, validation_status', { count: 'exact' }),
        supabase.from('pplp_v2_mint_records').select('mint_amount_user, mint_amount_platform'),
        supabase.from('pplp_v2_user_actions').select('action_type_code, created_at', { count: 'exact' }),
        supabase.from('profiles').select('id, updated_at'),
      ]);

      const totalLightScore = (validations.data || []).reduce((s: number, v: any) => s + (v.final_light_score || 0), 0);
      const totalFunMinted = (mintRecords.data || []).reduce((s: number, m: any) => s + (m.mint_amount_user || 0) + (m.mint_amount_platform || 0), 0);
      const approved = (validations.data || []).filter((v: any) => v.validation_status === 'approved').length;
      const validationRate = validations.count ? Math.round((approved / validations.count) * 100) : 0;

      const now = new Date();
      const day1 = new Date(now.getTime() - 86400000).toISOString();
      const day7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const day30 = new Date(now.getTime() - 30 * 86400000).toISOString();

      const allProfiles = (profiles.data || []) as any[];
      const dau = allProfiles.filter(p => p.updated_at && p.updated_at >= day1).length;
      const wau = allProfiles.filter(p => p.updated_at && p.updated_at >= day7).length;
      const mau = allProfiles.filter(p => p.updated_at && p.updated_at >= day30).length;

      // Top action categories
      const catCount: Record<string, number> = {};
      (actions.data || []).forEach(a => {
        catCount[a.action_type_code] = (catCount[a.action_type_code] || 0) + 1;
      });
      const topCategories = Object.entries(catCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code, count]) => ({ code, count }));

      return { totalLightScore, totalFunMinted, dau, wau, mau, validationRate, totalActions: actions.count || 0, topCategories };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Card><CardContent className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent></Card>;

  const d = data!;
  const stats = [
    { icon: Sun, label: 'Total Light Score', value: d.totalLightScore.toLocaleString(), color: 'text-gold' },
    { icon: Coins, label: 'Total FUN Minted', value: d.totalFunMinted.toLocaleString(), color: 'text-primary' },
    { icon: Users, label: 'DAU / WAU / MAU', value: `${d.dau} / ${d.wau} / ${d.mau}`, color: 'text-accent' },
    { icon: CheckCircle, label: 'Validation Rate', value: `${d.validationRate}%`, color: 'text-success' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5 text-gold" /> Tổng quan hệ sinh thái</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-lg border bg-background p-4 text-center space-y-1">
              <s.icon className={`h-5 w-5 mx-auto ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Top Action Categories ({d.totalActions} tổng)</p>
          <div className="space-y-1">
            {d.topCategories.map(c => (
              <div key={c.code} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{c.code}</span>
                <span className="font-medium">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
