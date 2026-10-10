import type { Eip1193Provider, EIP6963AnnounceProviderEvent } from './types.js';

type ProoflyWindow = Window & {
  ethereum?: Eip1193Provider & { isProofly?: boolean; isSafeHand?: boolean };
  proofly?: Eip1193Provider;
  safehand?: Eip1193Provider;
};

/**
 * Discovers the active SafeHand / Proofly EIP-1193 provider in a browser context.
 * SSR-safe: returns null immediately if executed on the server.
 */
export function getProoflyProviderSync(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;

  const win = window as ProoflyWindow;

  // 1. Dedicated SafeHand or Proofly namespace
  if (win.safehand && typeof win.safehand.request === 'function') {
    return win.safehand;
  }
  if (win.proofly && typeof win.proofly.request === 'function') {
    return win.proofly;
  }

  // 2. window.ethereum flagged as SafeHand / Proofly
  if (win.ethereum && (win.ethereum.isSafeHand || win.ethereum.isProofly) && typeof win.ethereum.request === 'function') {
    return win.ethereum;
  }

  return null;
}

export const getSafeHandProviderSync = getProoflyProviderSync;

/**
 * Asynchronously locates SafeHand / Proofly using EIP-6963 announcement and window polling.
 */
export async function discoverProoflyProvider(timeoutMs = 1500): Promise<Eip1193Provider | null> {
  if (typeof window === 'undefined') return null;

  const existing = getProoflyProviderSync();
  if (existing) return existing;

  return new Promise<Eip1193Provider | null>((resolve) => {
    let settled = false;

    const cleanup = (provider: Eip1193Provider | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
      clearTimeout(timer);
      clearInterval(poller);
      resolve(provider);
    };

    const handleAnnounce = (event: EIP6963AnnounceProviderEvent) => {
      const detail = event?.detail;
      const name = detail?.info?.name?.toLowerCase() ?? '';
      const rdns = detail?.info?.rdns?.toLowerCase() ?? '';

      if (
        name.includes('safehand') ||
        rdns.includes('safehand') ||
        name.includes('proofly') ||
        rdns.includes('proofly') ||
        detail?.provider?.isSafeHand ||
        detail?.provider?.isProofly
      ) {
        cleanup(detail.provider);
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce as EventListener);

    // Request providers per EIP-6963
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    } catch { /* ignore */ }

    // Fallback polling for window.safehand / window.proofly
    const poller = setInterval(() => {
      const p = getProoflyProviderSync();
      if (p) cleanup(p);
    }, 50);

    const timer = setTimeout(() => {
      cleanup(getProoflyProviderSync());
    }, timeoutMs);
  });
}

export const discoverSafeHandProvider = discoverProoflyProvider;
export const getSafeHandProvider = discoverProoflyProvider;
