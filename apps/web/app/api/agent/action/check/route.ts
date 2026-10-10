import { NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { z } from 'zod';
import { insertAuditLog, insertTransactionEvent } from '../../../../../lib/server/persistence';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const requestSchema = z.object({
  walletAddress: addressSchema.optional(),
  policy: z.object({
    maxLimitUSD: z.number().positive(),
    expiry: z.number().int().positive(),
    allowedContracts: z.array(addressSchema).min(1),
  }),
  action: z.object({
    to: addressSchema,
    valueUsd: z.number().nonnegative(),
    txHash: z.string().startsWith('0x').optional(),
    chainId: z.number().int().positive().optional(),
    actionName: z.string().min(1).optional(),
  }),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { policy, action } = parsed.data;
  const normalizedWallet = parsed.data.walletAddress ? getAddress(parsed.data.walletAddress) : null;
  const normalizedActionTo = getAddress(action.to);
  const allowedList = policy.allowedContracts.map((contract) => getAddress(contract));
  let allowed = true;
  let reason: string | null = null;

  if (Date.now() > policy.expiry) {
    allowed = false;
    reason = 'Policy expired.';
  }

  if (allowed && action.valueUsd > policy.maxLimitUSD) {
    allowed = false;
    reason = 'Amount exceeds policy maxLimitUSD.';
  }

  if (allowed) {
    const contractAllowed = allowedList.some((contract) => contract.toLowerCase() === normalizedActionTo.toLowerCase());

    if (!contractAllowed) {
      allowed = false;
      reason = 'Target contract not in allowlist.';
    }
  }

  if (normalizedWallet) {
    await insertAuditLog({
      actorAddress: normalizedWallet,
      eventType: allowed ? 'agent_action_allowed' : 'agent_action_blocked',
      txHash: action.txHash ?? null,
      payload: {
        actionTo: normalizedActionTo,
        valueUsd: action.valueUsd,
        reason,
      },
    });

    if (action.txHash) {
      await insertTransactionEvent({
        walletAddress: normalizedWallet,
        chainId: action.chainId ?? 84532,
        contractAddress: normalizedActionTo,
        actionName: action.actionName ?? 'agent-check',
        txHash: action.txHash,
        status: allowed ? 'approved' : 'rejected',
      });
    }
  }

  if (!allowed) {
    return NextResponse.json({ allowed: false, reason });
  }

  return NextResponse.json({ allowed: true });
}
