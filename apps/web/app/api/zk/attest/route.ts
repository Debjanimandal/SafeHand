import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { getOptionalDb } from '../../../../lib/db/client';
import { insertAuditLog, upsertWalletProfile } from '../../../../lib/server/persistence';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/zk/attest
 *
 * Records a cryptographic attestation of wallet ownership, optionally binding ZK selective-
 * disclosure claims. All sensitive source values are pre-hashed client-side — only the
 * cryptographic commitments and boolean results are stored here.
 *
 * Body: { address, nullifierHash, claim?, documentHash? }
 * Response: { verified: true, provider: 'proofly-attest', nullifierHash }
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    address?: string;
    nullifierHash?: string;
    claim?: { type: string; result: boolean; commitment: string } | null;
    documentHash?: string | null;
  };

  if (!body.address || !isAddress(body.address)) {
    return NextResponse.json(
      { error: 'Valid wallet address required.' },
      { status: 400, headers: corsHeaders },
    );
  }

  const normalizedAddress = getAddress(body.address);
  const nullifierHash = body.nullifierHash
    ?? `0x${Date.now().toString(16).padStart(64, '0')}`;
  const claim = body.claim ?? null;
  const documentHash = body.documentHash ?? null;
  const action = process.env.WORLD_ID_ACTION ?? 'proofly-human-verify';

  const sql = getOptionalDb();
  if (sql) {
    // ── Persist proof event ──────────────────────────────────────────────────
    await sql`
      INSERT INTO public.proof_events
        (wallet_address, proof_provider, action, nullifier_hash, status, verified_at, chain_id, document_hash)
      VALUES (
        ${normalizedAddress},
        'proofly-attest',
        ${action},
        ${nullifierHash},
        'verified',
        ${new Date().toISOString()},
        84532,
        ${documentHash}
      )
      ON CONFLICT (nullifier_hash) DO UPDATE
        SET status = 'verified', verified_at = now(), document_hash = EXCLUDED.document_hash
    `.catch(() => { /* best-effort — local storage is primary record */ });

    // ── Persist ZK claim (if present) ────────────────────────────────────────
    if (claim?.type && typeof claim.result === 'boolean' && claim.commitment) {
      await sql`
        INSERT INTO public.zk_claims
          (wallet_address, nullifier_hash, claim_type, result, commitment)
        VALUES (
          ${normalizedAddress},
          ${nullifierHash},
          ${claim.type},
          ${claim.result},
          ${claim.commitment}
        )
        ON CONFLICT (nullifier_hash, claim_type) DO UPDATE
          SET result = EXCLUDED.result,
              commitment = EXCLUDED.commitment,
              verified_at = now()
      `.catch(() => { /* best-effort */ });
    }

    await upsertWalletProfile(normalizedAddress, {
      active_chain: '84532',
      verification_status: 'verified',
    }).catch(() => { /* best-effort */ });

    await insertAuditLog({
      actorAddress: normalizedAddress,
      eventType: 'proofly_attested',
      targetId: nullifierHash,
      payload: { claim_type: claim?.type ?? null },
    }).catch(() => { /* best-effort */ });
  }

  return NextResponse.json(
    { verified: true, provider: 'proofly-attest', nullifierHash },
    { headers: corsHeaders },
  );
}
