import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Heart, Shield, TrendingDown, Lock, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface HealthMetric {
  id: string;
  measured_at: string;
  value_expansion_ratio: number;
  utility_absorption_ratio: number;
  retention_quality_ratio: number;
  fraud_pressure_ratio: number;
  locked_stability_ratio: number;
  total_supply: number;
  circulating_supply: number;
  locked_supply: number;
  safe_mode: string;
  alerts: string[];
}

interface Vault {
  vault_key: string;
  vault_name: string;
  balance: number;
  total_inflow: number;
  total_outflow: number;
}

export default function FounderMonetaryHealthPanel() {
  const { data: latestHealth, isLoading: lh } = useQuery({
    queryKey: ['inflation-health-latest'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inflation_health_metrics')
        .select('*')
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as unknown as HealthMetric | null;
    },
    staleTime: 60_000,
  });

  const { data: vaults, isLoading: vl } = useQuery({
    queryKey: ['treasury-vaults'],
    queryFn: async () => {
      const { data } = await supabase
        .from('treasury_vaults')
        .select('*')
        .eq('is_active', true)
        .order('vault_key');
      return (data || []) as unknown as Vault[];
    },
    staleTime: 60_000,
  });

  const isLoading = lh || vl;
  const safeModeColor = latestHealth?.safe_mode === 'normal'
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    : 'bg-amber-500/10 text-amber-600 border-amber-500/30';

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Sức khỏe Tiền tệ FUN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-40 w-full" />}

        {!isLoading && !latestHealth && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Chưa có dữ liệu sức khỏe tiền tệ. Cron `inflation-health-job` sẽ chạy hàng ngày.
          </div>
        )}

        {latestHealth && (
          <>
            <div className="flex items-center gap-3">
              <Badge className={safeModeColor} variant="outline">
                {latestHealth.safe_mode === 'normal' ? '✓ Bình thường' : `⚠ ${latestHealth.safe_mode}`}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Cập nhật: {new Date(latestHealth.measured_at).toLocaleString('vi-VN')}
              </span>
            </div>

            {latestHealth.alerts && latestHealth.alerts.length > 0 && (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                {latestHealth.alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-foreground/90">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 5 Health Ratios */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <RatioCard
                icon={<TrendingDown className="w-4 h-4" />}
                label="Value Expansion"
                value={Number(latestHealth.value_expansion_ratio)}
                ideal=">= 1.0"
              />
              <RatioCard
                icon={<Activity className="w-4 h-4" />}
                label="Utility Absorption"
                value={Number(latestHealth.utility_absorption_ratio)}
                ideal=">= 0.7"
              />
              <RatioCard
                icon={<Heart className="w-4 h-4" />}
                label="Retention Quality"
                value={Number(latestHealth.retention_quality_ratio)}
                ideal=">= 0.5"
              />
              <RatioCard
                icon={<Shield className="w-4 h-4" />}
                label="Fraud Pressure"
                value={Number(latestHealth.fraud_pressure_ratio)}
                ideal="< 0.1"
                inverse
              />
              <RatioCard
                icon={<Lock className="w-4 h-4" />}
                label="Locked Stability"
                value={Number(latestHealth.locked_stability_ratio)}
                ideal=">= 0.5"
              />
            </div>

            {/* Supply breakdown */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Tổng cung</div>
                <div className="text-base font-semibold">
                  {Math.floor(Number(latestHealth.total_supply)).toLocaleString('vi-VN')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Lưu thông</div>
                <div className="text-base font-semibold text-primary">
                  {Math.floor(Number(latestHealth.circulating_supply)).toLocaleString('vi-VN')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Đang khóa</div>
                <div className="text-base font-semibold text-muted-foreground">
                  {Math.floor(Number(latestHealth.locked_supply)).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Treasury vaults */}
        {vaults && vaults.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Treasury Vaults</div>
            <div className="space-y-1.5">
              {vaults.map((v) => (
                <div key={v.vault_key} className="flex items-center justify-between p-2 rounded-md border bg-card text-sm">
                  <span className="font-medium">{v.vault_name}</span>
                  <span className="font-mono text-primary">
                    {Math.floor(Number(v.balance)).toLocaleString('vi-VN')} FUN
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RatioCard({
  icon,
  label,
  value,
  ideal,
  inverse,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  ideal: string;
  inverse?: boolean;
}) {
  const pct = Math.min(100, value * 100);
  const isHealthy = inverse ? value < 0.1 : value >= 0.5;
  return (
    <div className="p-3 rounded-lg border bg-card space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-lg font-semibold ${isHealthy ? 'text-emerald-600' : 'text-amber-600'}`}>
        {value.toFixed(2)}
      </div>
      <Progress value={pct} className="h-1" />
      <div className="text-[10px] text-muted-foreground">Lý tưởng {ideal}</div>
    </div>
  );
}
