import type { Hex, ProoflyPolicyReason } from './types.js';

export class ProoflyError extends Error {
  public readonly code: number;

  constructor(message: string, code = 4900) {
    super(message);
    this.name = 'ProoflyError';
    this.code = code;
  }
}

export class ProviderNotFoundError extends ProoflyError {
  constructor(message = 'SafeHand Wallet extension is not installed or detected in this browser.') {
    super(message, 4902);
    this.name = 'ProviderNotFoundError';
  }
}

export class UserRejectedError extends ProoflyError {
  constructor(message = 'User rejected the request in SafeHand Wallet.') {
    super(message, 4001);
    this.name = 'UserRejectedError';
  }
}

export class WrongChainError extends ProoflyError {
  public readonly currentChainId: Hex;
  public readonly expectedChainId: Hex;

  constructor(currentChainId: Hex, expectedChainId: Hex) {
    super(`Connected to chain ${currentChainId}, expected ${expectedChainId}. Switch network in SafeHand.`, 4901);
    this.name = 'WrongChainError';
    this.currentChainId = currentChainId;
    this.expectedChainId = expectedChainId;
  }
}

export class PolicyDeniedError extends ProoflyError {
  public readonly reason: ProoflyPolicyReason;

  constructor(message: string, reason: ProoflyPolicyReason = 'DESTINATION_NOT_ALLOWED') {
    super(`Action blocked by AI Leash policy: ${message}`, 4001);
    this.name = 'PolicyDeniedError';
    this.reason = reason;
  }
}

export function parseProviderError(err: unknown): ProoflyError {
  if (err instanceof ProoflyError) return err;

  const errorObj = err as { code?: number; message?: string; data?: { reason?: ProoflyPolicyReason } };
  const message = errorObj?.message || 'Unknown provider error';
  const code = errorObj?.code || 4900;

  if (code === 4001) {
    if (message.toLowerCase().includes('policy') || message.toLowerCase().includes('exceed') || message.toLowerCase().includes('not allowed')) {
      let reason: ProoflyPolicyReason = 'DESTINATION_NOT_ALLOWED';
      if (message.includes('exceed')) reason = 'VALUE_LIMIT_EXCEEDED';
      else if (message.includes('expired')) reason = 'POLICY_EXPIRED';
      else if (message.includes('target') || message.includes('destinations')) reason = 'DESTINATION_NOT_ALLOWED';
      return new PolicyDeniedError(message, reason);
    }
    return new UserRejectedError(message);
  }

  return new ProoflyError(message, code);
}

export { ProoflyError as SafeHandError };
