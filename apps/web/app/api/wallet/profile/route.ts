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

  const [profileRows, proofRows, policyRows, activityRows] = sql
    ? await Promise.all([
        sql`SELECT wallet_address, display_name, active_chain, verification_status, created_at
            FROM public.wallet_profiles WHERE wallet_address = ${address} LIMIT 1`,
        sql`SELECT proof_provider, action, status, verified_at, tx_hash, created_at
            FROM public.proof_events WHERE wallet_address = ${address}
            ORDER BY created_at DESC LIMIT 10`,
        sql`SELECT agent_id, spend_limit, contract_allowlist, valid_until, status, policy_hash, created_at
            FROM public.policy_sessions WHERE wallet_address = ${address}
            ORDER BY created_at DESC LIMIT 20`,
        sql`SELECT event_type, target_id, created_at
            FROM public.audit_logs WHERE actor_address = ${address}
            ORDER BY created_at DESC LIMIT 20`,
      ])
    : [[], [], [], []];

  // Also check on-chain verification status
  const onChainVerified = await isVerifiedOnChain(address).catch(() => false);

  return NextResponse.json({
    profile: profileRows[0] ?? null,
    onChainVerified,
    proofs: proofRows,
    policies: policyRows,
    recentActivity: activityRows,
  });
}
