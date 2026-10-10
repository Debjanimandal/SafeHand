'use client';

import { useEffect, useState } from 'react';
import { walletRequest } from '../../lib/wallet/provider';

export default function AgentPolicyPage(): JSX.Element {
  const [walletAddress, setWalletAddress] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [maxLimitUSD, setMaxLimitUSD] = useState('50');
  const [allowedContracts, setAllowedContracts] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore wallet address from prior session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('proofly.session.address');
      if (stored) setWalletAddress(stored);
    } catch { /* ignore */ }
  }, []);

  async function connectWallet(): Promise<void> {
    setError(null);
    try {
      const accounts = (await walletRequest('eth_requestAccounts', [])) as string[];
      const addr = accounts[0] ?? '';
      setWalletAddress(addr);
      if (addr) localStorage.setItem('proofly.session.address', addr);
    } catch {
      const stored = localStorage.getItem('proofly.session.address');
      if (stored) {
        setWalletAddress(stored);
      } else {
        setError('Extension not found. Visit the Wallet page to connect first.');
      }
    }
  }

  async function createPolicy(): Promise<void> {
    setError(null);
    setResult(null);

    if (!walletAddress) {
      setError('Connect wallet first.');
      return;
    }

    const response = await fetch('/api/agent/policy/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        agentAddress,
        maxLimitUSD: Number(maxLimitUSD),
        expiry: Date.now() + 1000 * 60 * 60,
        allowedContracts: allowedContracts.split(',').map((value) => value.trim()).filter(Boolean),
      }),
    });

    if (!response.ok) {
      setError(await response.text());
      return;
    }

    const body = (await response.json()) as { policyHash: string };
    setResult(body.policyHash);
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto grid w-full max-w-shell gap-6">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold tracking-tight">AI Policy Engine</h1>
          <p className="mt-2 text-sm text-subtext">Define leash constraints before autonomous agent actions are permitted.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-3">
            <div className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-subtext">
              Connected wallet: {walletAddress || 'Not connected'}
            </div>
            <button
              className="rounded-xl border border-border bg-transparent px-4 py-2 text-sm"
              type="button"
              onClick={() => {
                void connectWallet();
              }}
            >
              Connect Wallet
            </button>
            <input
              className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm"
              placeholder="Agent address (0x...)"
              value={agentAddress}
              onChange={(event) => setAgentAddress(event.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm"
              placeholder="Max spend in USD"
              value={maxLimitUSD}
              onChange={(event) => setMaxLimitUSD(event.target.value)}
            />
            <textarea
              className="min-h-20 rounded-xl border border-border bg-elevated px-3 py-2 text-sm"
              placeholder="Allowed contracts (comma-separated)"
              value={allowedContracts}
              onChange={(event) => setAllowedContracts(event.target.value)}
            />
            <button
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              type="button"
              onClick={() => {
                void createPolicy();
              }}
            >
              Create Policy
            </button>
          </div>

          {result ? <p className="mt-3 break-all text-xs text-subtext">Policy Hash: {result}</p> : null}
          {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
