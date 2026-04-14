import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function FounderPPLPAnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-pplp-analytics'],
    queryFn: async () => {
      const { data: vals } = await supabase.from('pplp_v2_validations').select('serving_life, transparent_truth, healing_love, long_term_value, unity_over_separation, final_light_score, validation_status');
      const rows = (vals || []) as any[];

      const pillarTotals = { serving_life: 0, transparent_truth: 0, healing_love: 0, long_term_value: 0, unity_over_separation: 0 };
      let count = rows.length;
      rows.forEach((r: any) => {
        pillarTotals.serving_life += r.serving_life || 0;
        pillarTotals.transparent_truth += r.transparent_truth || 0;
        pillarTotals.healing_love += r.healing_love || 0;
        pillarTotals.long_term_value += r.long_term_value || 0;
        pillarTotals.unity_over_separation += r.unity_over_separation || 0;
      });

      const pillarLabels: Record<string, string> = {
        serving_life: 'Phụng sự',
        transparent_truth: 'Chân thật',
        healing_love: 'Chữa lành',
        long_term_value: 'Giá trị',
        unity_over_separation: 'Hợp nhất',
      };

      const pillarData = Object.entries(pillarTotals).map(([k, total]) => ({
        name: pillarLabels[k] || k,
        avg: count ? Math.round(total / count) : 0,
      }));

      const strongest = pillarData.reduce((a, b) => a.avg > b.avg ? a : b, pillarData[0]);
      const weakest = pillarData.reduce((a, b) => a.avg < b.avg ? a : b, pillarData[0]);

      // Score distribution buckets
      const buckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
      rows.forEach(r => {
        const s = r.final_light_score || 0;
        const idx = Math.min(4, Math.floor(s / 20));
        buckets[idx]++;
      });

      const rejected = rows.filter(r => r.validation_status === 'rejected').length;

      return { pillarData, strongest, weakest, buckets, total: rows.length, rejected };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Card><CardContent className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent></Card>;

  const d = data!;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /> PPLP Analytics</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 text-sm">
          <div className="flex-1 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Strongest</p>
            <p className="font-bold text-primary">{d.strongest?.name}</p>
            <p className="text-xs">avg {d.strongest?.avg}</p>
          </div>
          <div className="flex-1 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Weakest</p>
            <p className="font-bold text-destructive">{d.weakest?.name}</p>
            <p className="text-xs">avg {d.weakest?.avg}</p>
          </div>
          <div className="flex-1 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="font-bold">{d.rejected}/{d.total}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Điểm trung bình theo trụ cột</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.pillarData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avg" fill="hsl(142 76% 26%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Phân bổ điểm Light Score</p>
          <div className="flex gap-1 items-end h-16">
            {['0-20', '20-40', '40-60', '60-80', '80-100'].map((label, i) => {
              const max = Math.max(...d.buckets, 1);
              const h = (d.buckets[i] / max) * 100;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/20 rounded-t" style={{ height: `${h}%`, minHeight: 4 }}>
                    <div className="w-full h-full bg-primary rounded-t" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <span className="text-[10px] font-medium">{d.buckets[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
