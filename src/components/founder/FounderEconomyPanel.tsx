import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Coins } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function FounderEconomyPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-economy'],
    queryFn: async () => {
      const { data: records } = await supabase.from('pplp_v2_mint_records').select('mint_amount_user, mint_amount_platform, created_at, action_id');
      const rows = records || [];

      let totalUser = 0, totalPlatform = 0;
      const dailyMap: Record<string, number> = {};
      rows.forEach(r => {
        totalUser += r.mint_amount_user || 0;
        totalPlatform += r.mint_amount_platform || 0;
        const day = (r.created_at || '').slice(0, 10);
        if (day) dailyMap[day] = (dailyMap[day] || 0) + (r.mint_amount_user || 0) + (r.mint_amount_platform || 0);
      });

      const mintFlow = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-30)
        .map(([date, amount]) => ({ date: date.slice(5), amount: Math.round(amount) }));

      // Top action types by FUN
      const { data: actions } = await supabase.from('pplp_v2_user_actions').select('id, action_type_code');
      const actionMap: Record<string, string> = {};
      (actions || []).forEach(a => { actionMap[a.id] = a.action_type_code; });

      const typeSum: Record<string, number> = {};
      rows.forEach(r => {
        const code = actionMap[r.action_id] || 'unknown';
        typeSum[code] = (typeSum[code] || 0) + (r.mint_amount_user || 0);
      });
      const topTypes = Object.entries(typeSum).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, amount]) => ({ code, amount: Math.round(amount) }));

      return { totalUser: Math.round(totalUser), totalPlatform: Math.round(totalPlatform), mintFlow, topTypes, totalRecords: rows.length };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Card><CardContent className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent></Card>;

  const d = data!;
  const total = d.totalUser + d.totalPlatform;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-gold" /> Economy Flow</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Minted</p>
            <p className="font-bold text-lg">{total.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">User (99%)</p>
            <p className="font-bold text-primary">{d.totalUser.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Platform (1%)</p>
            <p className="font-bold text-gold">{d.totalPlatform.toLocaleString()}</p>
          </div>
        </div>

        {d.mintFlow.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Mint Flow (30 ngày)</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={d.mintFlow}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="hsl(142 76% 26%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold mb-2">Top Actions by FUN</p>
          <div className="space-y-1">
            {d.topTypes.map(t => (
              <div key={t.code} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.code}</span>
                <span className="font-medium">{t.amount.toLocaleString()} FUN</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
