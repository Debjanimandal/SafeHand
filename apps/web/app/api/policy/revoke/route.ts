import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';
import { getOptionalDb } from '../../../../lib/db/client';
import { insertAuditLog } from '../../../../lib/server/persistence';

const schema = z.object({
  walletAddress: z.string().refine(isAddress, { message: 'Invalid wallet address.' }),
  policyId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as unknown;
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  }

  const { walletAddress, policyId } = parsed.data;
  const sql = getOptionalDb();

  if (!sql) {
    return NextResponse.json({ error: 'Database not available.' }, { status: 503 });
  }

  const rows = await sql`
    UPDATE public.policy_sessions
    SET status = 'revoked'
    WHERE id = ${policyId} AND wallet_address = ${walletAddress} AND status = 'active'
    RETURNING id, agent_id
  `;

  if (!rows[0]) {
    return NextResponse.json({ error: 'Policy not found or already revoked.' }, { status: 404 });
  }

  await insertAuditLog({
    actorAddress: walletAddress,
    eventType: 'policy_revoked',
    targetId: policyId,
    payload: { agentId: rows[0].agent_id },
  });

  return NextResponse.json({ status: 'revoked', policyId });
}
