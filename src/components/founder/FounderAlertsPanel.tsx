import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bell, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

interface Alert {
  type: 'warning' | 'info' | 'danger';
  message: string;
  time: string;
}

export default function FounderAlertsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['founder-alerts'],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 86400000).toISOString();
      const last1h = new Date(now.getTime() - 3600000).toISOString();

      const [recentLogs, recentActions, recentMints] = await Promise.all([
        supabase.from('pplp_v2_event_log').select('event_type, created_at, details').gte('created_at', last24h).order('created_at', { ascending: false }).limit(50),
        supabase.from('pplp_v2_user_actions').select('id, created_at').gte('created_at', last1h),
        supabase.from('pplp_v2_mint_records').select('mint_amount_user, created_at').gte('created_at', last24h),
      ]);

      const alerts: Alert[] = [];
      const actionsLastHour = (recentActions.data || []).length;
      if (actionsLastHour > 50) {
        alerts.push({ type: 'warning', message: `Spike: ${actionsLastHour} actions trong 1 giờ qua`, time: format(now, 'HH:mm') });
      }

      const mintTotal = (recentMints.data || []).reduce((s, m) => s + (m.mint_amount_user || 0), 0);
      if (mintTotal > 10000) {
        alerts.push({ type: 'danger', message: `Khối lượng mint cao: ${Math.round(mintTotal).toLocaleString()} FUN/24h`, time: format(now, 'HH:mm') });
      }

      const flagEvents = (recentLogs.data || []).filter(l =>
        ['duplicate_detected', 'velocity_limit', 'spam_detected'].includes(l.event_type)
      );
      if (flagEvents.length > 10) {
        alerts.push({ type: 'danger', message: `${flagEvents.length} flag events trong 24h`, time: format(new Date(flagEvents[0].created_at), 'HH:mm') });
      }

      // Recent notable events
      (recentLogs.data || []).slice(0, 5).forEach(log => {
        alerts.push({
          type: 'info',
          message: `${log.event_type}`,
          time: format(new Date(log.created_at), 'HH:mm'),
        });
      });

      return { alerts: alerts.slice(0, 10), actionsLastHour, mintTotal24h: Math.round(mintTotal) };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Card><CardContent className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent></Card>;

  const d = data!;
  const iconMap = { danger: AlertTriangle, warning: Bell, info: Info };
  const colorMap = { danger: 'text-destructive bg-destructive/10', warning: 'text-gold bg-gold/10', info: 'text-muted-foreground bg-muted' };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-gold" /> Real-Time Alerts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {d.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Không có cảnh báo nào 🎉</p>
        ) : (
          d.alerts.map((alert, i) => {
            const Icon = iconMap[alert.type];
            return (
              <div key={i} className={`flex items-start gap-2 rounded-lg p-2 text-sm ${colorMap[alert.type]}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="flex-1">{alert.message}</span>
                <span className="text-xs opacity-60 shrink-0">{alert.time}</span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
