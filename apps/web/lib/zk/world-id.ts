export interface WorldIdVerifyParams {
  appId: string;
  action: string;
  signal: string;
}

export interface WorldIdProofPayload {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

/**
 * Fetches World ID app config from the server for a given wallet address.
 * Returns null if the server does not return valid params.
 */
export async function fetchWorldIdParams(address: string): Promise<WorldIdVerifyParams | null> {
  const response = await fetch('/api/zk/worldid/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { appId?: string; action?: string; signal?: string };

  if (!body.appId || !body.action || !body.signal) {
    return null;
  }

  return { appId: body.appId, action: body.action, signal: body.signal };
}

/**
 * Submits a World ID proof to the server for verification and persistence.
 */
export async function confirmWorldIdProof(
  proof: WorldIdProofPayload,
  address: string,
): Promise<{ verified: boolean; error?: string }> {
  const response = await fetch('/api/zk/worldid/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...proof, address }),
  });

  if (!response.ok) {
    return { verified: false, error: await response.text() };
  }

  return { verified: true };
}
