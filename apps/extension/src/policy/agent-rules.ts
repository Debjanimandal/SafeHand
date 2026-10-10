import type { Hex } from 'viem';
import type { AgentPolicy } from '../shared/types';

const POLICY_STORAGE_KEY = 'proofly.agent-policies.v1';

export interface PolicyTransaction {
  from: Hex;
  to?: Hex;
  valueUsd: number;
}

export type PolicyReasonCode =
  | 'VALUE_LIMIT_EXCEEDED'
  | 'DESTINATION_NOT_ALLOWED'
  | 'POLICY_EXPIRED'
  | 'POLICY_REVOKED'
  | 'UNSUPPORTED_TRANSACTION'
  | 'POLICY_VIOLATION';

export class PolicyViolationError extends Error {
  public readonly code = 4001;
  public readonly reason: PolicyReasonCode;

  constructor(message: string, reason: PolicyReasonCode = 'POLICY_VIOLATION') {
    super(message);
    this.name = 'PolicyViolationError';
    this.reason = reason;
  }
}

export async function getAllPolicies(): Promise<AgentPolicy[]> {
  const output = await chrome.storage.local.get([POLICY_STORAGE_KEY]);
  return (output[POLICY_STORAGE_KEY] as AgentPolicy[] | undefined) ?? [];
}

export async function getPolicyByAgent(agentAddress: Hex): Promise<AgentPolicy | null> {
  const allPolicies = await getAllPolicies();
  // 1. Direct match by agentAddress or wallet address
  const directMatch = allPolicies.find((item) => item.agentAddress.toLowerCase() === agentAddress.toLowerCase());
  if (directMatch) return directMatch;

  // 2. Fallback to latest configured policy if single policy configured
  if (allPolicies.length === 1) {
    return allPolicies[0];
  }

  return null;
}

export async function upsertPolicy(policy: AgentPolicy): Promise<void> {
  const allPolicies = await getAllPolicies();
  const index = allPolicies.findIndex((item) => item.agentAddress.toLowerCase() === policy.agentAddress.toLowerCase());

  if (index === -1) {
    allPolicies.push(policy);
  } else {
    allPolicies[index] = policy;
  }

  await chrome.storage.local.set({ [POLICY_STORAGE_KEY]: allPolicies });
}

export async function removePolicy(agentAddress: Hex): Promise<void> {
  const allPolicies = await getAllPolicies();
  const filtered = allPolicies.filter((item) => item.agentAddress.toLowerCase() !== agentAddress.toLowerCase());
  await chrome.storage.local.set({ [POLICY_STORAGE_KEY]: filtered });
}

export function enforceAgentPolicy(policy: AgentPolicy, tx: PolicyTransaction): void {
  if (policy.revoked) {
    throw new PolicyViolationError('Policy has been revoked.', 'POLICY_REVOKED');
  }

  if (Date.now() > policy.expiry) {
    throw new PolicyViolationError('Policy expired.', 'POLICY_EXPIRED');
  }

  if (tx.valueUsd > policy.maxLimitUSD) {
    throw new PolicyViolationError(
      `Transaction value exceeds policy maxLimitUSD ($${tx.valueUsd.toFixed(2)} > $${policy.maxLimitUSD}).`,
      'VALUE_LIMIT_EXCEEDED'
    );
  }

  if (!tx.to) {
    throw new PolicyViolationError('Transaction target required.', 'UNSUPPORTED_TRANSACTION');
  }

  const contractAllowed = policy.allowedContracts.some(
    (allowed) => allowed.toLowerCase() === tx.to?.toLowerCase(),
  );

  if (!contractAllowed) {
    throw new PolicyViolationError(
      `Target contract ${tx.to} is not in the allowed destinations list.`,
      'DESTINATION_NOT_ALLOWED'
    );
  }
}

