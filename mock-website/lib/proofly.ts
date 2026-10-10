export interface EIP1193Provider {
  isSafeHand?: boolean;
  isProofly?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34'; // 84532
export const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;
export const SAFEHAND_REGISTRY_ADDRESS = '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997';
export const PROOFLY_REGISTRY_ADDRESS = SAFEHAND_REGISTRY_ADDRESS;
export const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

/**
 * Detects the injected SafeHand / Proofly EIP-1193 provider.
 * Looks for window.safehand / window.proofly first, then window.ethereum (if isSafeHand / isProofly),
 * or listens for EIP-6963 announcement.
 */
export async function getSafeHandProvider(timeoutMs = 1500): Promise<EIP1193Provider | null> {
  if (typeof window === 'undefined') return null;

  const w = window as unknown as {
    safehand?: EIP1193Provider;
    proofly?: EIP1193Provider;
    ethereum?: EIP1193Provider;
  };

  if (w.safehand) return w.safehand;
  if (w.proofly) return w.proofly;

  if (w.ethereum?.isSafeHand || w.ethereum?.isProofly) {
    return w.ethereum;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const onAnnounce = (event: Event) => {
      const customEvent = event as CustomEvent<{
        info: { rdns?: string; name?: string };
        provider: EIP1193Provider;
      }>;
      const detail = customEvent.detail;
      const rdns = detail?.info?.rdns ?? '';
      const name = detail?.info?.name?.toLowerCase() ?? '';
      if (
        rdns === 'xyz.safehand.wallet' ||
        rdns === 'xyz.proofly.wallet' ||
        name.includes('safehand') ||
        name.includes('proofly')
      ) {
        resolved = true;
        window.removeEventListener('eip6963:announceProvider', onAnnounce);
        resolve(detail.provider);
      }
    };

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener('eip6963:announceProvider', onAnnounce);
        if (w.safehand) {
          resolve(w.safehand);
        } else if (w.proofly) {
          resolve(w.proofly);
        } else if (w.ethereum?.isSafeHand || w.ethereum?.isProofly) {
          resolve(w.ethereum);
        } else {
          resolve(null);
        }
      }
    }, timeoutMs);
  });
}

export const getProoflyProvider = getSafeHandProvider;

/**
 * Queries isVerified(address) on the deployed ProoflyRegistry on Base Sepolia.
 */
export async function queryOnChainRegistry(walletAddress: string): Promise<boolean> {
  try {
    const cleanAddr = walletAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    // selector for isVerified(address) is 0xb9209e33
    const callData = `0xb9209e33${cleanAddr}`;

    const res = await fetch(BASE_SEPOLIA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: PROOFLY_REGISTRY_ADDRESS, data: callData }, 'latest'],
      }),
    });

    if (!res.ok) return false;
    const json = (await res.json()) as { result?: string };
    if (!json.result) return false;
    // result is 32-byte boolean hex: 0x0...01 is true, 0x0...00 is false
    const num = BigInt(json.result);
    return num === BigInt(1);
  } catch {
    return false;
  }
}
