'use client';

import { useMemo, useState } from 'react';
import { createWalletChallenge, verifyWalletChallenge } from '../../lib/wallet/auth-client';
import { walletRequest } from '../../lib/wallet/provider';

export default function WalletConsole(): React.JSX.Element {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shortAddress = useMemo(() => {
    if (!address) {
      return 'Disconnected';
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  async function connect(): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const accounts = (await walletRequest('eth_requestAccounts', [])) as string[];
      const selected = accounts[0] ?? null;
      setAddress(selected);

      if (selected) {
        const currentChainId = (await walletRequest('eth_chainId', [])) as string;
        setChainId(currentChainId);
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function disconnect(): void {
    setAddress(null);
    setChainId(null);
    setSessionToken(null);
    setError(null);
  }

  async function signIn(): Promise<void> {
    if (!address) {
      setError('Connect wallet first.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const challenge = await createWalletChallenge(address);
      const signature = (await walletRequest('personal_sign', [challenge.message, address])) as string;
      const verification = await verifyWalletChallenge(address, challenge.nonce, signature);
      setSessionToken(verification.sessionToken);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold tracking-tight">Wallet Console</h2>
      <p className="mt-2 text-sm text-subtext">Website surface only. Signing authority remains inside extension popup approvals.</p>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Address</p>
          <p className="mt-1 font-mono text-text">{shortAddress}</p>
        </div>
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Chain</p>
          <p className="mt-1 font-mono text-text">{chainId ?? 'N/A'}</p>
        </div>
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Session</p>
          <p className="mt-1 break-all font-mono text-text">{sessionToken ?? 'Unauthenticated'}</p>
        </div>
      </div>

      {error ? <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {!address ? (
          <button
            className="col-span-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
            onClick={() => { void connect(); }}
            disabled={busy}
            type="button"
          >
            Connect
          </button>
        ) : (
          <>
            <button
              className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-text disabled:opacity-50"
              onClick={() => { void signIn(); }}
              disabled={busy || Boolean(sessionToken)}
              type="button"
            >
              {sessionToken ? 'Signed In' : 'Sign In'}
            </button>
            <button
              className="rounded-xl border border-red-900/50 bg-transparent px-3 py-2 text-sm text-red-400 hover:bg-red-950/20 disabled:opacity-50"
              onClick={disconnect}
              disabled={busy}
              type="button"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </section>
  );
}
