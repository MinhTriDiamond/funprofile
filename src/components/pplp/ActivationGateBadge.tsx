import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLightScoreParams } from '@/hooks/useLightScoreParams';
import { useLightScore } from '@/hooks/useLightScore';
import { checkActivation, featureLabel, type GatedFeature } from '@/lib/lightScoreGates';

interface Props {
  feature: GatedFeature;
  className?: string;
  /** Override score (mặc định lấy từ useLightScore) */
  score?: number;
  /** Override TC (mặc định 1.0) */
  tc?: number;
  /** Hiện cả khi đã unlock */
  showWhenUnlocked?: boolean;
}

export function ActivationGateBadge({ feature, className, score, tc, showWhenUnlocked = false }: Props) {
  const { data: params } = useLightScoreParams();
  const { data: lightScore } = useLightScore();
  const phase = params?.active_phase;
  const userScore = score ?? lightScore?.total_light_score ?? 0;
  const userTc = tc ?? 1.0;

  if (!phase) return null;

  const result = checkActivation(feature, userScore, userTc, phase);
  if (result.allowed && !showWhenUnlocked) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={result.allowed ? 'secondary' : 'outline'}
            className={`gap-1 text-[10px] ${className ?? ''} ${result.allowed ? '' : 'border-amber-300 text-amber-700 dark:text-amber-400'}`}
          >
            {!result.allowed && <Lock className="w-2.5 h-2.5" />}
            {result.allowed ? `✓ ${featureLabel(feature)}` : result.reason}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-medium">{featureLabel(feature)}</p>
          <p className="text-muted-foreground mt-1">
            {result.allowed
              ? 'Bạn đã đủ điều kiện sử dụng tính năng này.'
              : `${result.reason}. Hiện tại bạn có LS=${userScore.toFixed(1)}, Trust=${userTc.toFixed(2)}.`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
