import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { z } from 'zod';
import { getOptionalDb } from '../../../../../lib/db/client';
import { insertAuditLog } from '../../../../../lib/server/persistence';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const policySchema = z.object({
  walletAddress: addressSchema,
  agentAddress: addressSchema,
  maxLimitUSD: z.number().positive(),
  expiry: z.number().int().positive(),
  allowedContracts: z.array(addressSchema).default([]),
});

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const parsed = policySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const policy = {
    ...parsed.data,
    walletAddress: getAddress(parsed.data.walletAddress),
    agentAddress: getAddress(parsed.data.agentAddress),
    allowedContracts: parsed.data.allowedContracts.map((address) => getAddress(address)),
  };

  if (policy.expiry <= Date.now()) {
    return NextResponse.json({ error: 'Policy expiry must be in the future.' }, { status: 400 });
  }

  const policyHashSource = JSON.stringify(policy);
  const policyHash = `0x${createHash('sha256').update(policyHashSource).digest('hex')}`;

  const sql = getOptionalDb();
  if (sql) {
    const rows = await sql`
      INSERT INTO public.policy_sessions
        (wallet_address, agent_id, spend_limit, token_allowlist, contract_allowlist,
         valid_from, valid_until, status, policy_hash)
      VALUES (
        ${policy.walletAddress},
        ${policy.agentAddress},
        ${policy.maxLimitUSD},
        ${JSON.stringify([])},
        ${JSON.stringify(policy.allowedContracts)},
        ${new Date().toISOString()},
        ${new Date(policy.expiry).toISOString()},
        'active',
        ${policyHash}
      )
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Unable to persist policy.' }, { status: 500 });
    }

    await insertAuditLog({
      actorAddress: policy.walletAddress,
      eventType: 'policy_created',
      targetId: rows[0].id as string,
      payload: { policyHash, agentAddress: policy.agentAddress },
    });
  }

  return NextResponse.json({ status: 'created', policyHash, policy });
}
