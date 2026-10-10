import { NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { issueChallenge } from '../../../../lib/server/challenges';
import { insertAuditLog, upsertWalletProfile } from '../../../../lib/server/persistence';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { address?: string };

    if (!body.address) {
      return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
    }

    const address = getAddress(body.address);
    const challenge = await issueChallenge(address);
    await upsertWalletProfile(address, { active_chain: '84532' });
    await insertAuditLog({
      actorAddress: address,
      eventType: 'wallet_challenge_created',
      targetId: challenge.nonce,
      payload: { expiresAt: challenge.expiresAt },
    });

    return NextResponse.json({
      nonce: challenge.nonce,
      expiresAt: new Date(challenge.expiresAt).toISOString(),
      message: challenge.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
