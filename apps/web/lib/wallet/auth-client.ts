export async function createWalletChallenge(address: string): Promise<{ nonce: string; message: string; expiresAt: string }> {
  const response = await fetch('/api/wallet/challenge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = 'Failed to create challenge.';
    try { message = (JSON.parse(raw) as { error?: string }).error ?? message; } catch { message = raw || message; }
    throw new Error(message);
  }

  return response.json() as Promise<{ nonce: string; message: string; expiresAt: string }>;
}

export async function verifyWalletChallenge(
  address: string,
  nonce: string,
  signature: string,
): Promise<{ sessionToken: string }> {
  const response = await fetch('/api/wallet/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, nonce, signature }),
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = 'Challenge verification failed.';
    try { message = (JSON.parse(raw) as { error?: string }).error ?? message; } catch { message = raw || message; }
    throw new Error(message);
  }

  return response.json() as Promise<{ sessionToken: string }>;
}
