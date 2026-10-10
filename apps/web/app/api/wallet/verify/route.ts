import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getAddress, recoverMessageAddress } from 'viem';
import { getOptionalDb } from '../../../../lib/db/client';
import { consumeChallenge } from '../../../../lib/server/challenges';
import { insertAuditLog, sha256Hex, upsertWalletProfile } from '../../../../lib/server/persistence';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    address?: string;
    nonce?: string;
    signature?: string;
  };

  if (!body.address || !body.nonce || !body.signature) {
    return NextResponse.json({ error: 'Address, nonce, and signature are required.' }, { status: 400 });
  }

  const challenge = await consumeChallenge(body.nonce);

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found or already consumed.' }, { status: 400 });
  }

  if (Date.now() > challenge.expiresAt) {
    return NextResponse.json({ error: 'Challenge expired.' }, { status: 400 });
  }

  const requestedAddress = getAddress(body.address);

  if (requestedAddress !== challenge.address) {
    return NextResponse.json({ error: 'Address does not match challenge.' }, { status: 400 });
  }

  const message = `Proofly Sign-In\nAddress: ${challenge.address}\nNonce: ${body.nonce}\nChain: Base Sepolia (84532)`;
  const signer = await recoverMessageAddress({ message, signature: body.signature as `0x${string}` });

  if (getAddress(signer) !== requestedAddress) {
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 401 });
  }

  const sessionToken = randomBytes(32).toString('hex');
  const signatureHash = createHash('sha256').update(body.signature).digest('hex');

  const sql = getOptionalDb();
  if (sql) {
    const rows = await sql`
      INSERT INTO public.wallet_sessions
        (wallet_address, nonce, signature_hash, session_token_hash, expires_at)
      VALUES (
        ${requestedAddress},
        ${body.nonce},
        ${signatureHash},
        ${sha256Hex(sessionToken)},
        ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}
      )
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Unable to persist wallet session.' }, { status: 500 });
    }

    await upsertWalletProfile(requestedAddress, { active_chain: '84532' });
    await insertAuditLog({
      actorAddress: requestedAddress,
      eventType: 'wallet_authenticated',
      targetId: rows[0].id as string,
      payload: { signatureHash },
    });
  }

  return NextResponse.json({ sessionToken, signatureHash, walletAddress: requestedAddress });
}
