import type { Hex } from 'viem';

export const PROOFLY_BRIDGE_NAMESPACE = 'PROOFLY_RPC_BRIDGE';

export type ProoflyRpcMethod =
  | 'eth_requestAccounts'
  | 'eth_accounts'
  | 'eth_chainId'
  | 'personal_sign'
  | 'eth_sign'
  | 'eth_signTypedData_v4'
  | 'eth_sendTransaction'
  | 'wallet_switchEthereumChain'
  | 'wallet_addEthereumChain'
  // SafeHand custom: returns the locally-stored government-ID identity hash
  // (and non-PII metadata) so relying dApps can prove the ID without PII.
  | 'safehand_getIdentityHash';

export interface BridgeRpcRequest {
  namespace: typeof PROOFLY_BRIDGE_NAMESPACE;
  channel: 'request';
  id: string;
  origin: string;
  method: ProoflyRpcMethod;
  params?: unknown[];
}

export interface BridgeRpcResponse {
  namespace: typeof PROOFLY_BRIDGE_NAMESPACE;
  channel: 'response';
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface WalletSessionState {
  unlocked: boolean;
  address: Hex | null;
  chainId: Hex;
}

export interface PendingApprovalRequest {
  id: string;
  origin: string;
  method: ProoflyRpcMethod;
  params?: unknown[];
  createdAt: number;
  requiresHumanProof?: boolean;
}

export interface ApprovalDecision {
  id: string;
  approved: boolean;
  reason?: string;
  proofContext?: {
    zkProof: string[];
    nullifier: Hex;
    voiceHash: Hex;
  };
  compositeSignature?: CompositeSignaturePayload;
}

export interface AgentPolicy {
  agentAddress: Hex;
  maxLimitUSD: number;
  expiry: number;
  allowedContracts: Hex[];
  revoked?: boolean;
}

export interface CompositeSignaturePayload {
  signature: Hex;
  zkProof: string[];
  nullifier: Hex;
  voiceHash: Hex;
  humanVerified: true;
}
