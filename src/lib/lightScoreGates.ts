// PPLP v2.5 — Activation Gates (Section IX)
// Quy tắc bật/khoá tính năng theo Light Score + Trust Context
export type GatedFeature =
  | 'earn_basic'
  | 'earn_advanced'
  | 'referral'
  | 'governance_vote'
  | 'proposal_submit'
  | 'validator';

export interface PhaseThresholds {
  threshold_earn_basic: number;
  threshold_earn_advanced: number;
  threshold_referral: number;
  threshold_governance: number;
  threshold_proposal: number;
  threshold_validator: number;
  min_tc_for_basic: number;
}

const FEATURE_LABEL: Record<GatedFeature, string> = {
  earn_basic: 'Kiếm LS cơ bản',
  earn_advanced: 'Kiếm LS nâng cao',
  referral: 'Phần thưởng giới thiệu',
  governance_vote: 'Bỏ phiếu governance',
  proposal_submit: 'Gửi đề xuất',
  validator: 'Vai trò validator',
};

export function checkActivation(
  feature: GatedFeature,
  score: number,
  tc: number,
  thresholds: PhaseThresholds,
): { allowed: boolean; reason?: string; required?: number; requiredTc?: number } {
  switch (feature) {
    case 'earn_basic': {
      if (score < thresholds.threshold_earn_basic) {
        return { allowed: false, required: thresholds.threshold_earn_basic, reason: `Cần LS ≥ ${thresholds.threshold_earn_basic}` };
      }
      if (tc < thresholds.min_tc_for_basic) {
        return { allowed: false, requiredTc: thresholds.min_tc_for_basic, reason: `Cần Trust ≥ ${thresholds.min_tc_for_basic}` };
      }
      return { allowed: true };
    }
    case 'earn_advanced':
      return score >= thresholds.threshold_earn_advanced
        ? { allowed: true }
        : { allowed: false, required: thresholds.threshold_earn_advanced, reason: `Cần LS ≥ ${thresholds.threshold_earn_advanced}` };
    case 'referral':
      return score >= thresholds.threshold_referral
        ? { allowed: true }
        : { allowed: false, required: thresholds.threshold_referral, reason: `Cần LS ≥ ${thresholds.threshold_referral}` };
    case 'governance_vote':
      return score >= thresholds.threshold_governance
        ? { allowed: true }
        : { allowed: false, required: thresholds.threshold_governance, reason: `Cần LS ≥ ${thresholds.threshold_governance} để bỏ phiếu` };
    case 'proposal_submit':
      return score >= thresholds.threshold_proposal
        ? { allowed: true }
        : { allowed: false, required: thresholds.threshold_proposal, reason: `Cần LS ≥ ${thresholds.threshold_proposal} để gửi đề xuất` };
    case 'validator':
      return score >= thresholds.threshold_validator
        ? { allowed: true }
        : { allowed: false, required: thresholds.threshold_validator, reason: `Cần LS ≥ ${thresholds.threshold_validator}` };
  }
}

export function featureLabel(f: GatedFeature) {
  return FEATURE_LABEL[f];
}

export function displayLS(rawLS: number): number {
  return 100 * Math.log(1 + Math.max(0, rawLS));
}
