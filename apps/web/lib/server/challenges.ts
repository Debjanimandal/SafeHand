import { randomBytes } from 'crypto';
import { getOptionalDb } from '../db/client';

const challengeStore = new Map<string, { address: string; expiresAt: number }>();

export interface ConsumedChallenge {
  address: string;
  expiresAt: number;
}

export interface IssuedChallenge {
  nonce: string;
  expiresAt: number;
  message: string;
}

function buildSignInMessage(address: string, nonce: string): string {
  return `SafeHand Sign-In\nAddress: ${address}\nNonce: ${nonce}\nChain: Base Sepolia (84532)`;
}

export async function issueChallenge(address: string): Promise<IssuedChallenge> {
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const sql = getOptionalDb();

  if (sql) {
    await sql`
      INSERT INTO public.wallet_challenges (nonce, wallet_address, expires_at)
      VALUES (${nonce}, ${address}, ${new Date(expiresAt).toISOString()})
    `;
  } else {
    challengeStore.set(nonce, { address, expiresAt });
  }

  return { nonce, expiresAt, message: buildSignInMessage(address, nonce) };
}

export async function consumeChallenge(nonce: string): Promise<ConsumedChallenge | null> {
  const sql = getOptionalDb();

  if (sql) {
    const rows = await sql`
      SELECT id, wallet_address, expires_at
      FROM public.wallet_challenges
      WHERE nonce = ${nonce}
        AND consumed_at IS NULL
    `;

    const challenge = rows[0];
    if (!challenge) return null;

    const consumed = await sql`
      UPDATE public.wallet_challenges
      SET consumed_at = now()
      WHERE id = ${challenge.id as string}
        AND consumed_at IS NULL
      RETURNING id
    `;

    if (!consumed[0]) return null;

    return {
      address: challenge.wallet_address as string,
      expiresAt: new Date(challenge.expires_at as string).getTime(),
    };
  }

  const challenge = challengeStore.get(nonce) ?? null;
  if (challenge) challengeStore.delete(nonce);
  return challenge;
}
