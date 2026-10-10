export interface WalletProfile {
  walletAddress: string;
  displayName?: string;
  activeChain: string;
  verificationStatus: 'unverified' | 'verified';
}

export interface ProofEvent {
  walletAddress: string;
  provider: 'world-id';
  action: string;
  nullifierHash: string;
  status: 'pending' | 'verified' | 'failed';
  verifiedAt?: string;
  chainId: number;
  txHash?: string;
}

export interface PolicySession {
  walletAddress: string;
  agentAddress: string;
  maxLimitUSD: number;
  allowedContracts: string[];
  validUntil: string;
}
