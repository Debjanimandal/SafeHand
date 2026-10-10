import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { z } from 'zod';
import { getOptionalDb } from '../../../../lib/db/client';
import { insertAuditLog } from '../../../../lib/server/persistence';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const mediaSchema = z.object({
  walletAddress: addressSchema,
  fileHash: z.string().startsWith('0x'),
  signature: z.string().startsWith('0x'),
  proofNullifier: z.string().startsWith('0x').optional(),
  txHash: z.string().startsWith('0x').optional(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = mediaSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const walletAddress = getAddress(parsed.data.walletAddress);
  const signatureHash = createHash('sha256').update(parsed.data.signature).digest('hex');
  const sql = getOptionalDb();

  if (sql) {
    const rows = await sql`
      INSERT INTO public.media_signatures (wallet_address, file_hash, signature_hash, proof_reference)
      VALUES (
        ${walletAddress},
        ${parsed.data.fileHash},
        ${signatureHash},
        ${parsed.data.proofNullifier ?? null}
      )
      RETURNING id, created_at
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Unable to persist media signature.' }, { status: 500 });
    }

    await insertAuditLog({
      actorAddress: walletAddress,
      eventType: 'media_signed',
      targetId: rows[0].id as string,
      txHash: parsed.data.txHash ?? null,
      payload: {
        fileHash: parsed.data.fileHash,
        proofNullifier: parsed.data.proofNullifier ?? null,
      },
    });

    return NextResponse.json({
      status: 'recorded',
      record: {
        ...parsed.data,
        walletAddress,
        signatureHash,
        recordedAt: rows[0].created_at,
      },
    });
  }

  return NextResponse.json({
    status: 'recorded',
    record: {
      ...parsed.data,
      walletAddress,
      signatureHash,
      recordedAt: new Date().toISOString(),
    },
  });
}
