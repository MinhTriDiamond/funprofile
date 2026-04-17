import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Props {
  vs?: number; bs?: number; ss?: number; os?: number; hs?: number; rf?: number; tc?: number;
}

const ROWS = [
  { key: 'vs', label: 'Verification Strength', weight: 0.30, color: 'bg-emerald-500' },
  { key: 'bs', label: 'Behavior Stability', weight: 0.25, color: 'bg-sky-500' },
  { key: 'ss', label: 'Social Trust', weight: 0.15, color: 'bg-violet-500' },
  { key: 'os', label: 'On-chain Credibility', weight: 0.20, color: 'bg-amber-500' },
  { key: 'hs', label: 'Historical Cleanliness', weight: 0.10, color: 'bg-rose-500' },
] as const;

export function TrustEngineBreakdown(props: Props) {
  const values: Record<string, number | undefined> = props as any;
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Trust Engine Breakdown</CardTitle>
        <p className="text-xs text-muted-foreground">
          TC = (0.30·VS + 0.25·BS + 0.15·SS + 0.20·OS + 0.10·HS) × RF
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {ROWS.map((r) => {
          const v = Number(values[r.key] ?? 0);
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{r.label} <span className="text-muted-foreground">×{r.weight}</span></span>
                <span className="font-mono">{v.toFixed(2)}</span>
              </div>
              <Progress value={v * 100} className="h-1.5" />
            </div>
          );
        })}
        <div className="pt-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Risk Factor</span>
          <span className="font-mono text-sm">×{Number(props.rf ?? 1).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Trust Confidence</span>
          <span className="font-mono text-lg font-bold text-violet-600 dark:text-violet-400">
            {Number(props.tc ?? 0).toFixed(3)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
