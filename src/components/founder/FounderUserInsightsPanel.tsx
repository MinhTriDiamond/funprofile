import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function FounderUserInsightsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-user-insights'],
    queryFn: async () => {
      const [rep, flagged] = await Promise.all([
        supabase.from('light_reputation').select('user_id, total_light_score, consistency_streak, tier').order('total_light_score', { ascending: false }).limit(20),
        supabase.from('pplp_v2_user_actions').select('user_id', { count: 'exact' }).eq('status', 'flagged'),
      ]);

      const topUsers = rep.data || [];
      // Trust distribution by tier
      const tierDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
      topUsers.forEach(u => { tierDist[u.tier] = (tierDist[u.tier] || 0) + 1; });

      // Fetch display names for top 10
      const top10Ids = topUsers.slice(0, 10).map(u => u.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', top10Ids);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.id] = p.display_name || p.id.slice(0, 8); });

      return {
        topUsers: topUsers.slice(0, 10).map(u => ({ ...u, name: nameMap[u.user_id] || u.user_id.slice(0, 8) })),
        flaggedCount: flagged.count || 0,
        tierDist,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Card><CardContent className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent></Card>;

  const d = data!;
  const tierNames = ['Seeker', 'Builder', 'Guardian', 'Luminary'];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> User Insights</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {d.flaggedCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {d.flaggedCount} users bị flag
          </div>
        )}
        <div>
          <p className="text-sm font-semibold mb-2">Top 10 Light Score</p>
          <div className="space-y-2">
            {d.topUsers.map((u, i) => (
              <div key={u.user_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <span className="font-medium truncate max-w-[120px]">{u.name}</span>
                  <span className="text-xs text-muted-foreground">🔥{u.consistency_streak || 0}d</span>
                </div>
                <span className="font-bold text-primary">{u.total_light_score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Trust Distribution</p>
          <div className="grid grid-cols-4 gap-2">
            {tierNames.map((name, i) => (
              <div key={name} className="text-center rounded-lg border p-2">
                <p className="text-lg font-bold">{d.tierDist[i] || 0}</p>
                <p className="text-xs text-muted-foreground">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
