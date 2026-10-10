'use client';

import { encodeFunctionData } from 'viem';
import { useEffect, useState } from 'react';
import { walletRequest } from '../../lib/wallet/provider';
import { POLICY_ABI } from '../../lib/contracts/abis';

interface ProofEvent {
  proof_provider: string;
  action: string;
  status: string;
  verified_at: string | null;
  tx_hash: string | null;
}

interface PolicySession {
  id: string;
  agent_id: string;
  spend_limit: number;
  contract_allowlist: string[];
  valid_until: string;
  status: string;
  policy_hash: string | null;
}

interface ActivityItem {
  event_type: string;
  target_id: string | null;
  created_at: string;
}

interface ProfileData {
  profile: {
    wallet_address: string;
    display_name: string | null;
    active_chain: string;
    verification_status: string;
    created_at: string;
  } | null;
  onChainVerified: boolean;
  proofs: ProofEvent[];
  policies: PolicySession[];
  recentActivity: ActivityItem[];
}

export default function ProfilePage(): JSX.Element {
  const [address, setAddress] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Auto-restore address from prior session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('proofly.session.address');
      if (stored) { setAddress(stored); void loadProfile(stored); }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(): Promise<void> {
    try {
      setError(null);
      const accounts = (await walletRequest('eth_requestAccounts', [])) as string[];
      const addr = accounts[0];
      if (!addr) return;
      setAddress(addr);
      localStorage.setItem('proofly.session.address', addr);
      await loadProfile(addr);
    } catch {
      const stored = localStorage.getItem('proofly.session.address');
      if (stored) {
        setAddress(stored);
        await loadProfile(stored);
      } else {
        setError('Extension not found. Visit the Wallet page to connect first.');
      }
    }
  }

  async function loadProfile(addr: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wallet/profile?address=${addr}`);
      if (!res.ok) throw new Error(await res.text());
      setData((await res.json()) as ProfileData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function revokePolicy(policyId: string, agentId: string): Promise<void> {
    if (!address) return;
    setRevoking(policyId);
    try {
      // Update DB
      const res = await fetch('/api/policy/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, policyId }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Revoke on-chain via extension (best-effort)
      const policyContract = process.env.NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS;
      if (policyContract) {
        const data = encodeFunctionData({
          abi: POLICY_ABI,
          functionName: 'revokePolicy',
          args: [agentId as `0x${string}`],
        });
        await walletRequest('eth_sendTransaction', [{ from: address, to: policyContract, data }]).catch(() => {
          // Best-effort — user may cancel or extension may be locked
        });
      }

      await loadProfile(address);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevoking(null);
    }
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto grid w-full max-w-shell gap-6">

        {/* Header */}
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-2 text-sm text-subtext">Verification status, active policies, and proof history.</p>
        </section>

        {/* Connect */}
        {!address ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm text-subtext">Connect your wallet to view your profile.</p>
            <button
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              onClick={() => { void connect(); }}
              type="button"
            >
              Connect Wallet
            </button>
            {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
          </section>
        ) : (
          <>
            {/* Identity card */}
            <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Wallet</p>
                  <p className="font-mono text-sm text-text">{shortAddr(address)}</p>
                </div>
                {data ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    data.onChainVerified
                      ? 'bg-white/10 text-white'
                      : 'border border-border text-subtext'
                  }`}>
                    {data.onChainVerified ? 'Human Verified' : 'Unverified'}
                  </span>
                ) : null}
              </div>
              {data?.profile ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-subtext">
                  <div><span className="text-muted">Chain:</span> Base Sepolia ({data.profile.active_chain})</div>
                  <div><span className="text-muted">DB Status:</span> {data.profile.verification_status}</div>
                  <div><span className="text-muted">On-Chain:</span> {data.onChainVerified ? 'Verified' : 'Not verified'}</div>
                  <div><span className="text-muted">Since:</span> {new Date(data.profile.created_at).toLocaleDateString()}</div>
                </div>
              ) : null}
              <button
                className="text-xs text-subtext underline"
                onClick={() => { void loadProfile(address); }}
                type="button"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </section>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}

            {/* Proofs */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium">Proof History</h2>
              {data?.proofs.length ? (
                <div className="space-y-2">
                  {data.proofs.map((proof, i) => (
                    <div key={i} className="rounded-xl border border-border bg-elevated p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="font-mono text-subtext">{proof.proof_provider}</span>
                        <span className={proof.status === 'verified' ? 'text-white' : 'text-red-400'}>{proof.status}</span>
                      </div>
                      <p className="mt-1 text-muted">Action: {proof.action}</p>
                      {proof.verified_at ? (
                        <p className="text-muted">Verified: {new Date(proof.verified_at).toLocaleString()}</p>
                      ) : null}
                      {proof.tx_hash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${proof.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block font-mono text-subtext underline break-all"
                        >
                          {proof.tx_hash.slice(0, 18)}...
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No proofs yet. Complete World ID verification first.</p>
              )}
            </section>

            {/* Active Policies */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium">Active AI Policies</h2>
              {data?.policies.filter(p => p.status === 'active').length ? (
                <div className="space-y-2">
                  {data.policies.filter(p => p.status === 'active').map((policy) => (
                    <div key={policy.id} className="rounded-xl border border-border bg-elevated p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-mono text-subtext">{shortAddr(policy.agent_id)}</span>
                        <span className="text-muted">Limit: ${policy.spend_limit}</span>
                      </div>
                      <p className="text-muted">Expires: {new Date(policy.valid_until).toLocaleString()}</p>
                      <p className="text-muted break-all">
                        Contracts: {(policy.contract_allowlist ?? []).join(', ') || 'None'}
                      </p>
                      <button
                        className="mt-1 rounded-lg border border-border px-2 py-1 text-xs text-subtext"
                        disabled={revoking === policy.id}
                        onClick={() => { void revokePolicy(policy.id, policy.agent_id); }}
                        type="button"
                      >
                        {revoking === policy.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No active policies.</p>
              )}
            </section>

            {/* Recent Activity */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium">Recent Activity</h2>
              {data?.recentActivity.length ? (
                <div className="space-y-1">
                  {data.recentActivity.map((item, i) => (
                    <div key={i} className="flex justify-between rounded-lg px-2 py-1.5 text-xs text-subtext even:bg-elevated">
                      <span className="font-mono">{item.event_type}</span>
                      <span className="text-muted">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No activity yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
