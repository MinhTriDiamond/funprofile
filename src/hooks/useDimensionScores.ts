import { useLightScore } from '@/hooks/useLightScore';
import { DIMENSION_LEVELS } from '@/config/pplp';

export interface DimensionScores {
  identity: number;
  activity: number;
  onchain: number;
  transparency: number;
  ecosystem: number;
}

export interface DimensionData {
  dimensions: DimensionScores | null;
  dimensionTotal: number | null;
  dimensionLevel: string | null;
  riskPenalty: number;
  streakBonusPct: number;
  inactiveDays: number;
  decayApplied: boolean;
  isLoading: boolean;
  getLevelInfo: () => typeof DIMENSION_LEVELS[0];
  getNextLevelProgress: () => { progress: number; nextLevel: typeof DIMENSION_LEVELS[0]; remaining: number };
}

export const useDimensionScores = (): DimensionData => {
  const { data, isLoading } = useLightScore();

  const dimensions = (data as any)?.dimensions ?? null;
  const dimensionTotal = (data as any)?.dimension_total ?? null;
  const dimensionLevel = (data as any)?.dimension_level ?? null;
  const riskPenalty = (data as any)?.risk_penalty ?? 0;
  const streakBonusPct = (data as any)?.streak_bonus_pct ?? 0;
  const inactiveDays = (data as any)?.inactive_days ?? 0;
  const decayApplied = (data as any)?.decay_applied ?? false;

  const getLevelInfo = () => {
    if (!dimensionTotal) return DIMENSION_LEVELS[0];
    if (dimensionTotal >= 800) return DIMENSION_LEVELS[4];
    if (dimensionTotal >= 500) return DIMENSION_LEVELS[3];
    if (dimensionTotal >= 250) return DIMENSION_LEVELS[2];
    if (dimensionTotal >= 100) return DIMENSION_LEVELS[1];
    return DIMENSION_LEVELS[0];
  };

  const getNextLevelProgress = () => {
    const score = dimensionTotal ?? 0;
    const levels = Object.values(DIMENSION_LEVELS);
    
    // Find current and next level
    let currentIdx = 0;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (score >= levels[i].minScore) { currentIdx = i; break; }
    }
    
    if (currentIdx >= levels.length - 1) {
      return { progress: 100, nextLevel: levels[levels.length - 1], remaining: 0 };
    }
    
    const current = levels[currentIdx];
    const next = levels[currentIdx + 1];
    const range = next.minScore - current.minScore;
    const progress = range > 0 ? ((score - current.minScore) / range) * 100 : 0;
    
    return {
      progress: Math.min(100, Math.max(0, progress)),
      nextLevel: next,
      remaining: Math.max(0, next.minScore - score),
    };
  };

  return {
    dimensions,
    dimensionTotal,
    dimensionLevel,
    riskPenalty,
    streakBonusPct,
    inactiveDays,
    decayApplied,
    isLoading,
    getLevelInfo,
    getNextLevelProgress,
  };
};
