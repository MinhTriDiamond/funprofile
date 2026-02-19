// =============================================
// PPLP EIP-712 Configuration
// Must match FUNMoneyProductionV1_2_1 contract exactly
// =============================================

export const CONTRACT_ADDRESS = '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6';
export const CHAIN_ID = 97; // BSC Testnet

export const EIP712_DOMAIN = {
  name: 'FUN Money',
  version: '1.2.1',
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT_ADDRESS,
} as const;

// PureLoveProof struct for attester signing
export const EIP712_TYPES = {
  PureLoveProof: [
    { name: 'user', type: 'address' },
    { name: 'actionHash', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// Authorized attester addresses
export const ATTESTER_ADDRESSES = [
  '0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1',
  '0xD41Cc6beCB196FaCa3CDebDa2f6Fb42A12EdC389',
];

// BSC Testnet RPC endpoints (fallback chain)
export const BSC_TESTNET_RPCS = [
  'https://data-seed-prebsc-1-s1.binance.org:8545',
  'https://data-seed-prebsc-2-s1.binance.org:8545',
  'https://data-seed-prebsc-1-s2.binance.org:8545',
  'https://data-seed-prebsc-1-s3.binance.org:8545',
  'https://data-seed-prebsc-2-s3.binance.org:8545',
];

// lockWithPPLP ABI (only the function we need)
export const LOCK_WITH_PPLP_ABI = [
  {
    name: 'lockWithPPLP',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'action', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'sigs', type: 'bytes[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'isAttester',
    type: 'function',
    inputs: [{ name: 'attester', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
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
    name: 'alloc',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'locked', type: 'uint256' },
      { name: 'activated', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

// Error classification for on-chain failures
export const ON_CHAIN_ERRORS = {
  ATTESTER_NOT_REGISTERED: 'Attester wallet not registered on contract',
  ACTION_NOT_REGISTERED: 'Action type not registered via govRegisterAction',
  INSUFFICIENT_GAS: 'Not enough tBNB for gas fees',
  RPC_FAILURE: 'All BSC Testnet RPCs failed',
  CONTRACT_REVERT: 'Contract execution reverted',
  NONCE_MISMATCH: 'Nonce does not match on-chain state',
} as const;
