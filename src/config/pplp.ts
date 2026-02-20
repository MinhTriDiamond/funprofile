// =============================================
// PPLP (Proof of Pure Love Protocol) Configuration
// Updated for On-Chain Minting with lockWithPPLP
// =============================================

export const FUN_MONEY_CONTRACT = {
  address: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6' as const,
  chainId: 97, // BSC Testnet
  name: 'FUN Money',
  symbol: 'FUN',
  decimals: 18,
};

// =============================================
// GOV-COMMUNITY Multisig: WILL + WISDOM + LOVE
// 9 đại diện cộng đồng, chia 3 nhóm, mỗi nhóm 3 người
// Yêu cầu: 1 chữ ký từ mỗi nhóm → tổng 3 chữ ký
// =============================================

export const GOV_GROUPS = {
  will: {
    name: 'Will',
    nameVi: 'Ý Chí',
    emoji: '💪',
    description: 'Kỹ thuật & Ý chí',
    color: 'blue',
    members: [
      { name: 'Minh Trí',   address: '0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1' },
      { name: 'Ánh Nguyệt', address: '0xfd0Da7a744245e7aCECCd786d5a743Ef9291a557' },
      { name: 'Thu Trang',  address: '0x02D5578173bd0DB25462BB32A254Cd4b2E6D9a0D' },
    ],
  },
  wisdom: {
    name: 'Wisdom',
    nameVi: 'Trí Tuệ',
    emoji: '🌟',
    description: 'Tầm nhìn chiến lược',
    color: 'yellow',
    members: [
      { name: 'Bé Giàu', address: '0xCa319fBc39F519822385F2D0a0114B14fa89A301' },
      { name: 'Bé Ngọc', address: '0x699CC96A8C4E3555f95Bd620EC4A218155641E09' },
      { name: 'Ái Vân',  address: '0x5102Ecc4a458a1af76aFA50d23359a712658a402' },
    ],
  },
  love: {
    name: 'Love',
    nameVi: 'Yêu Thương',
    emoji: '❤️',
    description: 'Nhân ái & Chữa lành',
    color: 'rose',
    members: [
      { name: 'Thanh Tiên', address: '0x0e1b399E4a88eB11dd0f77cc21E9B54835f6d385' },
      { name: 'Bé Kim',     address: '0x38db3eC4e14946aE497992e6856216641D22c242' },
      { name: 'Bé Hà',      address: '0x9ec8C51175526BEbB1D04100256De71CF99B7CCC' },
    ],
  },
} as const;

export type GovGroupKey = keyof typeof GOV_GROUPS;

export interface GovSignature {
  signer: string;
  signature: string;
  signed_at: string;
  signer_name: string | null;
}

export type MultisigSignatures = Partial<Record<GovGroupKey, GovSignature>>;

// Tất cả 9 địa chỉ GOV (cần đăng ký trên contract qua govRegisterAttester)
export const ALL_GOV_ADDRESSES: readonly string[] = Object.values(GOV_GROUPS).flatMap(g => g.members.map(m => m.address));

// Backward compat: ATTESTER_ADDRESSES vẫn trỏ về tất cả 9 địa chỉ
export const ATTESTER_ADDRESSES: readonly string[] = ALL_GOV_ADDRESSES;
export const ATTESTER_ADDRESS = GOV_GROUPS.will.members[0].address; // backward compat

// Tìm nhóm GOV của một địa chỉ ví
export function getGovGroupForAddress(addr: string): GovGroupKey | null {
  for (const [key, group] of Object.entries(GOV_GROUPS)) {
    if (group.members.some(m => m.address.toLowerCase() === addr.toLowerCase())) {
      return key as GovGroupKey;
    }
  }
  return null;
}

// Tìm tên thành viên GOV
export function getGovMemberName(addr: string): string | null {
  for (const group of Object.values(GOV_GROUPS)) {
    const member = group.members.find(m => m.address.toLowerCase() === addr.toLowerCase());
    if (member) return member.name;
  }
  return null;
}

// Helper to check if an address is an authorized GOV attester
export const isAttesterAddress = (addr: string): boolean =>
  ALL_GOV_ADDRESSES.some(a => a.toLowerCase() === addr.toLowerCase());

// BSC Testnet RPC
export const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

// BSCScan URLs (Testnet - matching chainId 97)
export const BSCSCAN_URL = 'https://testnet.bscscan.com';
export const getTxUrl = (txHash: string) => `${BSCSCAN_URL}/tx/${txHash}`;
export const getAddressUrl = (address: string) => `${BSCSCAN_URL}/address/${address}`;

// Action Types
export type ActionType = 'post' | 'comment' | 'reaction' | 'share' | 'friend' | 'livestream' | 'new_user_bonus';

// Base Rewards (BR) - FUN tokens per action
export const BASE_REWARDS: Record<ActionType, number> = {
  post: 50,
  comment: 10,
  reaction: 10,
  share: 10,
  friend: 20,
  livestream: 200,
  new_user_bonus: 500,
};

// Daily Caps per action type
export const DAILY_CAPS: Record<ActionType, { maxActions: number; maxReward: number }> = {
  post: { maxActions: 10, maxReward: 500 },
  comment: { maxActions: 50, maxReward: 500 },
  reaction: { maxActions: 50, maxReward: 500 },
  share: { maxActions: 10, maxReward: 100 },
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

// =============================================
// EIP-712 Configuration for lockWithPPLP
// =============================================

// EIP-712 Domain - MUST match contract exactly
export const EIP712_DOMAIN = {
  name: 'FUN Money',
  version: '1.2.1',
  chainId: 97,
  verifyingContract: FUN_MONEY_CONTRACT.address,
} as const;

// EIP-712 Types for PureLoveProof - MUST match contract PPLP_TYPEHASH exactly:
// keccak256("PureLoveProof(address user,bytes32 actionHash,uint256 amount,bytes32 evidenceHash,uint256 nonce)")
export const EIP712_PPLP_TYPES = {
  PureLoveProof: [
    { name: 'user', type: 'address' },
    { name: 'actionHash', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// Legacy export for backwards compatibility
export const EIP712_LOCK_TYPES = EIP712_PPLP_TYPES;

// Contract ABI for FUN Money v1.2.1
// Based on FUNMoneyProductionV1_2_1 verified source
export const FUN_MONEY_ABI = [
  // Read functions
  {
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'alloc',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'locked', type: 'uint256' },
      { name: 'activated', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'actions',
    type: 'function',
    inputs: [{ name: 'actionHash', type: 'bytes32' }],
    outputs: [
      { name: 'allowed', type: 'bool' },
      { name: 'version', type: 'uint32' },
      { name: 'deprecated', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'isAttester',
    type: 'function',
    inputs: [{ name: 'attester', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  // Write functions - lockWithPPLP matches contract signature exactly
  {
    name: 'lockWithPPLP',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'action', type: 'string' },      // STRING action name, not bytes32!
      { name: 'amount', type: 'uint256' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'sigs', type: 'bytes[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'activate',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'claim',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// =============================================
// Distribution Configuration
// =============================================

// 3-Level Cascade Distribution
// Community Genesis Pool → FUN Platform Pool → FUN Partner Pool → User
// 100% → 99% → 98.01% → 97.03%
export const DISTRIBUTION = {
  COMMUNITY_GENESIS_KEEP: 0.01, // 1%
  PLATFORM_POOL_KEEP: 0.01, // 1% of remaining
  PARTNER_POOL_KEEP: 0.01, // 1% of remaining
  USER_RECEIVE_RATIO: 0.9703, // 97.03% of minted amount
} as const;

// Token States
export const TOKEN_STATES = {
  LOCKED: 'locked',
  ACTIVATED: 'activated',
} as const;

// Mint Request Status
export const MINT_REQUEST_STATUS = {
  PENDING_SIG: 'pending_sig',
  SIGNED: 'signed',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const;

export type MintRequestStatus = typeof MINT_REQUEST_STATUS[keyof typeof MINT_REQUEST_STATUS];

// Signature deadline (1 hour from creation)
export const SIGNATURE_DEADLINE_SECONDS = 3600;

// Light Activities that earn FUN
export const LIGHT_ACTIVITIES = [
  'post', 'comment', 'reaction', 'share', 'friend', 'donate', 'livestream'
] as const;

// =============================================
// Helper Functions
// =============================================

// Convert FUN amount to Wei (18 decimals)
export const toWei = (amount: number | string): bigint => {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(amountNum * 1e18));
};

// Convert Wei to FUN amount
export const fromWei = (wei: bigint | string): number => {
  const weiNum = typeof wei === 'string' ? BigInt(wei) : wei;
  return Number(weiNum) / 1e18;
};

// Format FUN amount for display
export const formatFUN = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Calculate estimated user receive amount
export const calculateUserReceive = (mintAmount: number): number => {
  return mintAmount * DISTRIBUTION.USER_RECEIVE_RATIO;
};
