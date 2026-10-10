import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getOptionalDb } from '../../../../lib/db/client';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Valid wallet address is required.' }, { status: 400 });
  }

  const sql = getOptionalDb();
  if (!sql) {
    return NextResponse.json({ policies: [] });
  }

  const rows = await sql`
    SELECT id, agent_id, spend_limit, contract_allowlist, valid_until, status, policy_hash, created_at
    FROM public.policy_sessions
    WHERE wallet_address = ${address} AND status = 'active' AND valid_until > now()
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ policies: rows });
}
