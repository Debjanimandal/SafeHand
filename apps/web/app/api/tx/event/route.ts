import { NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { z } from 'zod';
import { insertAuditLog, insertTransactionEvent } from '../../../../lib/server/persistence';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const txEventSchema = z.object({
  walletAddress: addressSchema,
  chainId: z.number().int().positive(),
  contractAddress: addressSchema.optional(),
  actionName: z.string().min(1).optional(),
  txHash: z.string().startsWith('0x'),
  status: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = txEventSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const walletAddress = getAddress(input.walletAddress);
  const contractAddress = input.contractAddress ? getAddress(input.contractAddress) : null;

  await insertTransactionEvent({
    walletAddress,
    chainId: input.chainId,
    contractAddress,
    actionName: input.actionName ?? null,
    txHash: input.txHash,
    status: input.status,
  });

  await insertAuditLog({
    actorAddress: walletAddress,
    eventType: 'transaction_event_recorded',
    txHash: input.txHash,
    payload: {
      chainId: input.chainId,
      status: input.status,
      contractAddress,
      actionName: input.actionName ?? null,
      metadata: input.metadata ?? null,
    },
  });

  return NextResponse.json({ status: 'recorded' });
}
