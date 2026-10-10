'use client';

type RequestArgs = {
  method: string;
  params?: unknown[];
};

type BrowserProvider = {
  request(args: RequestArgs): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: BrowserProvider;
    proofly?: BrowserProvider;
    safehand?: BrowserProvider;
  }
}

// Wait up to 3s for the SafeHand injected provider to appear
async function waitForProoflyProvider(timeoutMs = 3000): Promise<BrowserProvider> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (window.safehand) return window.safehand;
    if (window.proofly) return window.proofly;
    // Also accept window.ethereum if it's SafeHand / Proofly
    const eth = window.ethereum as (BrowserProvider & { isSafeHand?: boolean; isProofly?: boolean }) | undefined;
    if (eth?.isSafeHand || eth?.isProofly) {
      return eth as BrowserProvider;
    }
    await new Promise<void>((r) => setTimeout(r, 50));
  }

  throw new Error(
    'SafeHand extension not detected. Make sure:\n1. The extension is loaded in chrome://extensions\n2. You refreshed this tab after loading the extension.',
  );
}

export function getSafeHandProvider(): BrowserProvider {
  if (typeof window === 'undefined') throw new Error('Browser only.');
  if (window.safehand) return window.safehand;
  if (window.proofly) return window.proofly;
  const eth = window.ethereum as (BrowserProvider & { isSafeHand?: boolean; isProofly?: boolean }) | undefined;
  if (eth?.isSafeHand || eth?.isProofly) return eth;
  throw new Error('SafeHand extension not detected.');
}

export const getProoflyProvider = getSafeHandProvider;

export async function walletRequest(method: string, params: unknown[] = []): Promise<unknown> {
  if (typeof window === 'undefined') throw new Error('Browser only.');
  const provider = await waitForProoflyProvider();
  return provider.request({ method, params });
}
