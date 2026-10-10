import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { isVerifiedOnChain } from '../../../../lib/contracts/client';
import { getOptionalDb } from '../../../../lib/db/client';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Valid wallet address is required.' }, { status: 400 });
  }

  const sql = getOptionalDb();

  const [dbRows, onChainVerified] = await Promise.all([
    sql
      ? sql`SELECT status, verified_at, tx_hash, proof_provider, action, nullifier_hash
            FROM public.proof_events WHERE wallet_address = ${address}
            ORDER BY created_at DESC LIMIT 1`
      : Promise.resolve([]),
    isVerifiedOnChain(address).catch(() => false),
  ]);

  const latest = dbRows[0] ?? null;

  return NextResponse.json({
    address,
    dbVerified: latest?.status === 'verified',
    onChainVerified,
    latestProof: latest,
  });
}
