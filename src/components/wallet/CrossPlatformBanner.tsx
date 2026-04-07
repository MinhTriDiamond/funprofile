import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe2, Zap, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import angelLogo from '@/assets/tokens/fun-logo.png';

interface PlatformStats {
  angel_ai: number;
  fun_profile: number;
}

export function CrossPlatformBanner() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Count actions by reference_type
      const { count: angelCount } = await supabase
        .from('light_actions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reference_type', 'angel_ai');

      const { count: profileCount } = await supabase
        .from('light_actions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('reference_type', null);

      setStats({
        angel_ai: angelCount ?? 0,
        fun_profile: profileCount ?? 0,
      });
    };

    fetchStats();
  }, []);

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-amber-500/5 shadow-sm">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Hệ sinh thái hợp nhất</p>
              <p className="text-xs text-muted-foreground">
                Light Score & FUN Money được ghi nhận chung giữa tất cả nền tảng FUN
              </p>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 gap-1 text-xs">
                <Zap className="w-3 h-3" />
                Angel AI: {stats.angel_ai}
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 gap-1 text-xs">
                <Zap className="w-3 h-3" />
                FUN Profile: {stats.fun_profile}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
