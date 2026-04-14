import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function FounderAntiFakePanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-antifake'],
    queryFn: async () => {
      const [logs, pendingReview, rejectedActions] = await Promise.all([
        supabase.from('pplp_v2_event_log').select('event_type, created_at', { count: 'exact' }).in('event_type', ['duplicate_detected', 'velocity_limit', 'spam_detected', 'trust_decay']),
        supabase.from('pplp_v2_user_actions').select('id', { count: 'exact' }).eq('status', 'pending_review'),
        supabase.from('pplp_v2_validations').select('id', { count: 'exact' }).eq('validation_status', 'rejected'),
      ]);

      const logRows = logs.data || [];
      const typeCounts: Record<string, number> = {};
      logRows.forEach(l => { typeCounts[l.event_type] = (typeCounts[l.event_type] || 0) + 1; });

      return {
        totalFlags: logs.count || 0,
        duplicates: typeCounts['duplicate_detected'] || 0,
        velocityAbuse: typeCounts['velocity_limit'] || 0,
        spam: typeCounts['spam_detected'] || 0,
        trustDecay: typeCounts['trust_decay'] || 0,
        pendingReview: pendingReview.count || 0,
        rejected: rejectedActions.count || 0,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Card><CardContent className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent></Card>;

  const d = data!;
  const alerts = [
    { label: 'Duplicate detected', count: d.duplicates, color: 'text-destructive' },
    { label: 'Velocity abuse', count: d.velocityAbuse, color: 'text-destructive' },
    { label: 'Spam detected', count: d.spam, color: 'text-gold' },
    { label: 'Trust decay', count: d.trustDecay, color: 'text-muted-foreground' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Anti-Fake Monitor</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{d.pendingReview}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{d.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.label} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{a.label}</span>
              <span className={`font-bold ${a.color}`}>{a.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">Tổng flags: {d.totalFlags}</p>
      </CardContent>
    </Card>
  );
}
