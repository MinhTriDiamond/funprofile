 // =============================================
 // PPLP (Proof of Pure Love Protocol) Configuration
 // =============================================
 
 export const FUN_MONEY_CONTRACT = {
   address: '0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2' as const,
   chainId: 97, // BSC Testnet
   name: 'FUN Money',
   symbol: 'FUN',
   decimals: 18,
 };
 
 // Action Types
 export type ActionType = 'post' | 'comment' | 'reaction' | 'share' | 'friend' | 'livestream' | 'new_user_bonus';
 
 // Base Rewards (BR) - FUN tokens per action
 export const BASE_REWARDS: Record<ActionType, number> = {
   post: 100,
   comment: 20,
   reaction: 10,
   share: 50,
   friend: 20,
   livestream: 200,
   new_user_bonus: 500,
 };
 
 // Daily Caps per action type
 export const DAILY_CAPS: Record<ActionType, { maxActions: number; maxReward: number }> = {
   post: { maxActions: 10, maxReward: 1000 },
   comment: { maxActions: 50, maxReward: 1000 },
   reaction: { maxActions: 50, maxReward: 500 },
   share: { maxActions: 10, maxReward: 500 },
   friend: { maxActions: 10, maxReward: 200 },
   livestream: { maxActions: 5, maxReward: 1000 },
   new_user_bonus: { maxActions: 1, maxReward: 500 },
 };
 
 // Total daily cap per user (FUN)
 export const TOTAL_DAILY_CAP = 5000;
 
 // Global epoch cap (FUN per day for entire platform)
 export const GLOBAL_EPOCH_CAP = 10000000; // 10M FUN
 
 // Tier definitions
 export const TIERS = {
   0: { name: 'New Soul', minScore: 0, dailyCap: 500, emoji: '🌱' },
   1: { name: 'Light Seeker', minScore: 1000, dailyCap: 1000, emoji: '🌟' },
   2: { name: 'Light Bearer', minScore: 10000, dailyCap: 2500, emoji: '✨' },
   3: { name: 'Light Guardian', minScore: 100000, dailyCap: 5000, emoji: '👼' },
 } as const;
 
 // 5 Pillars of Light
 export const PILLARS = {
   service: { name: 'Service to Life', nameVi: 'Phụng sự sự sống', emoji: '☀️' },
   truth: { name: 'Transparent Truth', nameVi: 'Chân thật minh bạch', emoji: '🔍' },
   healing: { name: 'Healing & Love', nameVi: 'Chữa lành & yêu thương', emoji: '💚' },
   value: { name: 'Long-term Value', nameVi: 'Đóng góp bền vững', emoji: '🌱' },
   unity: { name: 'Unity', nameVi: 'Hợp Nhất', emoji: '🤝' },
 } as const;
 
 // Score ranges for ANGEL AI evaluation
 export const SCORE_RANGES = {
   quality: { min: 0.5, max: 3.0, default: 1.0 },
   impact: { min: 0.5, max: 5.0, default: 1.0 },
   integrity: { min: 0, max: 1.0, default: 1.0 },
   unity: { min: 0, max: 100, default: 50 },
 };
 
 // Unity Multiplier formula: Ux = 0.5 + (U / 50)
 export const calculateUnityMultiplier = (unityScore: number): number => {
   return Math.max(0.5, Math.min(2.5, 0.5 + (unityScore / 50)));
 };
 
 // Light Score formula: BR × Q × I × K × Ux
 export const calculateLightScore = (
   baseReward: number,
   qualityScore: number,
   impactScore: number,
   integrityScore: number,
   unityMultiplier: number
 ): number => {
   return Math.round(baseReward * qualityScore * impactScore * integrityScore * unityMultiplier * 100) / 100;
 };
 
 // Mint eligibility threshold
 export const MIN_LIGHT_SCORE_FOR_MINT = 10; // Minimum score to be eligible
 export const MIN_INTEGRITY_SCORE = 0.3; // Below this = suspected bot/spam
 
 // Cooldown settings
 export const CLAIM_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between claims
 
 // EIP-712 Domain for signature verification
 export const EIP712_DOMAIN = {
   name: 'FUN Money',
   version: '1',
   chainId: 97,
   verifyingContract: FUN_MONEY_CONTRACT.address,
 };
 
 export const EIP712_TYPES = {
   Mint: [
     { name: 'to', type: 'address' },
     { name: 'amount', type: 'uint256' },
     { name: 'nonce', type: 'uint256' },
     { name: 'deadline', type: 'uint256' },
   ],
 };