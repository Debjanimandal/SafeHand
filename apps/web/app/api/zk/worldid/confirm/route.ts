import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import type { IDKitResult, ResponseItemV3 } from '@worldcoin/idkit';
import { registerHumanProofOnChain } from '../../../../../lib/contracts/client';
import { getOptionalDb } from '../../../../../lib/db/client';
import { insertAuditLog, upsertWalletProfile } from '../../../../../lib/server/persistence';

/** Extract nullifier + merkle proof data from a v4 IDKitResult. */
function extractFromResult(idkitResult: IDKitResult): {
  nullifierHash: string;
  merkleRoot: string | null;
  proofHex: string | null;
} | null {
  const response = idkitResult.responses[0];
  if (!response) return null;

  if ('nullifier' in response) {
    const r = response as ResponseItemV3;
    const proofRaw = r.proof as string | string[];
    return {
      nullifierHash: r.nullifier,
      merkleRoot: r.merkle_root ?? null,
      proofHex: Array.isArray(proofRaw) ? (proofRaw as string[]).join('') : proofRaw,
    };
  }

  if ('session_nullifier' in response) {
    const sn = (response as { session_nullifier: string[] }).session_nullifier;
    return { nullifierHash: sn[0] ?? '', merkleRoot: null, proofHex: null };
  }

  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    // World ID 4.0 format
    rp_id?: string;
    idkitResponse?: IDKitResult;
    // Legacy format
    address?: string;
    merkle_root?: string;
    merkleRoot?: string;
    nullifier_hash?: string;
    nullifierHash?: string;
    proof?: string;
    verification_level?: string;
    verificationLevel?: string;
    // Optional document hash (SHA-256 of uploaded file)
    documentHash?: string;
    // Optional ZK selective-disclosure claim
    // e.g. { type: "age_gte_18", result: true, commitment: "0xabc..." }
    // The raw value (e.g. birth year) is NEVER sent here — only the boolean outcome.
    claim?: { type: string; result: boolean; commitment: string } | null;
  };

  const action = process.env.WORLD_ID_ACTION ?? 'proofly-human-verify';
  const normalizedAddress = body.address && isAddress(body.address) ? getAddress(body.address) : null;
  const documentHash = body.documentHash ?? null;
  const claim = body.claim ?? null;

  let nullifierHash: string;
  let merkleRoot: string | null = null;
  let proofHex: string | null = null;
  let verifyBody: unknown = null;

  if (body.rp_id && body.idkitResponse) {
    // â”€â”€ World ID 4.0 path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const verifyResponse = await fetch(
      `https://developer.world.org/api/v4/verify/${body.rp_id}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.idkitResponse),
      },
    );

    if (!verifyResponse.ok) {
      const text = await verifyResponse.text();
      return NextResponse.json({ error: `World ID verification failed: ${text}` }, { status: 400, headers: corsHeaders });
    }

    verifyBody = await verifyResponse.json();
    const extracted = extractFromResult(body.idkitResponse);
    if (!extracted || !extracted.nullifierHash) {
      return NextResponse.json({ error: 'Could not extract nullifier from proof.' }, { status: 400, headers: corsHeaders });
    }
    ({ nullifierHash, merkleRoot, proofHex } = extracted);
  } else {
    // â”€â”€ Legacy v2 path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
    if (!appId) {
      return NextResponse.json({ error: 'World ID app ID is not configured.' }, { status: 500, headers: corsHeaders });
    }

    const merkleRootLegacy = body.merkle_root ?? body.merkleRoot;
    const nullifierHashLegacy = body.nullifier_hash ?? body.nullifierHash;
    const verificationLevel = body.verification_level ?? body.verificationLevel ?? 'orb';

    if (!nullifierHashLegacy || !body.proof || !merkleRootLegacy) {
      return NextResponse.json({ error: 'Invalid World ID payload.' }, { status: 400, headers: corsHeaders });
    }

    const verifyResponse = await fetch(`https://developer.worldcoin.org/api/v2/verify/${appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merkle_root: merkleRootLegacy,
        nullifier_hash: nullifierHashLegacy,
        proof: body.proof,
        verification_level: verificationLevel,
        action,
        signal: body.address ?? 'proofly',
        app_id: appId,
        action_id: action,
      }),
    });

    if (!verifyResponse.ok) {
      const verifyText = await verifyResponse.text();
      return NextResponse.json({ error: `World ID verification failed: ${verifyText}` }, { status: 400, headers: corsHeaders });
    }

    verifyBody = await verifyResponse.json();
    nullifierHash = nullifierHashLegacy;
    merkleRoot = merkleRootLegacy;
    proofHex = body.proof ?? null;
  }

  // â”€â”€ Persist to DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (normalizedAddress) {
    const sql = getOptionalDb();
    if (sql) {
      const rows = await sql`
        INSERT INTO public.proof_events
          (wallet_address, proof_provider, action, nullifier_hash, status, verified_at, chain_id, document_hash)
        VALUES (
          ${normalizedAddress},
          'world-id',
          ${action},
          ${nullifierHash},
          'verified',
          ${new Date().toISOString()},
          84532,
          ${documentHash}
        )
        ON CONFLICT (nullifier_hash) DO UPDATE
          SET status = 'verified', verified_at = now(), document_hash = EXCLUDED.document_hash
        RETURNING id
      `;

      if (!rows[0]) {
        return NextResponse.json({ error: 'Unable to persist verification.' }, { status: 500, headers: corsHeaders });
      }

      // ── Persist ZK claim (selective disclosure) ────────────────────────
      // Only the claim type and boolean result are stored — never raw values.
      if (claim && claim.type && typeof claim.result === 'boolean' && claim.commitment) {
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
        `;
      }

      if (merkleRoot && proofHex) {
        void registerHumanProofOnChain(normalizedAddress, nullifierHash, merkleRoot, proofHex)
          .then(async (txHash) => {
            if (txHash && sql) {
              await sql`UPDATE public.proof_events SET tx_hash = ${txHash} WHERE nullifier_hash = ${nullifierHash}`;
            }
          })
          .catch(() => { /* on-chain registration is best-effort */ });
      }
    }

    await upsertWalletProfile(normalizedAddress, { active_chain: '84532', verification_status: 'verified' });
    await insertAuditLog({
      actorAddress: normalizedAddress,
      eventType: 'worldid_verified',
      targetId: nullifierHash,
      payload: { action, claim_type: claim?.type ?? null },
    });
  } else {
    await insertAuditLog({
      eventType: 'worldid_verified_unlinked',
      targetId: nullifierHash,
      payload: { action },
    });
  }

  return NextResponse.json({ verified: true, provider: 'world-id', result: verifyBody }, { headers: corsHeaders });
}
