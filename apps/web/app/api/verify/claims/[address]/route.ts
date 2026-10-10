import { NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { getOptionalDb } from '../../../../../lib/db/client';

/**
 * GET /api/verify/claims/[address]
 *
 * Returns the ZK claim results for a wallet address.
 * Only boolean results are returned — no raw personal data is ever stored or returned.
 *
 * Response: { claims: Array<{ claim_type, result, verified_at }> }
 *
 * Example:
 *   GET /api/verify/claims/0xABC...
 *   → { claims: [{ claim_type: "age_gte_18", result: true, verified_at: "2026-04-09T..." }] }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
): Promise<Response> {
  const { address } = await params;

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });
  }

  const normalizedAddress = getAddress(address);
  const sql = getOptionalDb();

  if (!sql) {
    return NextResponse.json({ claims: [] });
  }

  const rows = await sql`
    SELECT claim_type, result, verified_at
    FROM public.zk_claims
    WHERE wallet_address = ${normalizedAddress}
    ORDER BY verified_at DESC
  `;

  return NextResponse.json({ claims: rows });
}
