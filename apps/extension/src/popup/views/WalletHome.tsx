import { IDKitRequestWidget, orbLegacy, type IDKitErrorCodes, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { useEffect, useState } from 'react';
import type { Hex } from 'viem';
import { runtimeRequest } from '../../background/client';
import { getConfiguredContracts } from '../../chain/contracts';
import type { AgentPolicy } from '../../shared/types';
import { useWalletStore } from '../../store/wallet';
import {
  attestWithServer,
  generateLocalAttestation,
  getZkStatus,
  normalizeWorldIdResult,
  saveWorldIdProof,
  verifyProofWithServer,
  type StoredWorldIdProof,
  type ZkStatus,
} from '../../zk/world-id';
import { ErrorBanner } from '../components/ErrorBanner';

const contracts = getConfiguredContracts();
const apiBaseUrl = import.meta.env.VITE_PROOFLY_API_BASE_URL?.replace(/\/$/, '') as string | undefined;

type Tab = 'wallet' | 'policy' | 'keys' | 'id';

// ─── Utilities ───────────────────────────────────────────────────────────────

function getChainName(chainId: string | null): string {
  if (!chainId) return 'Unknown';
  const map: Record<string, string> = {
    '0x14a34': 'Base Sepolia',
    '0x2105': 'Base',
    '0x1': 'Ethereum',
    '84532': 'Base Sepolia',
    '8453': 'Base',
    '1': 'Ethereum',
  };
  return map[chainId] ?? `Chain ${chainId}`;
}

function getChainIdDecimal(chainId: string | null): string {
  if (!chainId) return '—';
  const n = chainId.startsWith('0x') ? parseInt(chainId, 16) : parseInt(chainId, 10);
  return isNaN(n) ? chainId : String(n);
}

function shorten(addr: string | null | undefined, start = 10, end = 6): string {
  if (!addr) return 'Unset';
  if (addr.length <= start + end + 3) return addr;
  return `${addr.slice(0, start)}…${addr.slice(-end)}`;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LockIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'wallet', label: 'Wallet' },
    { id: 'policy', label: 'Policy' },
    { id: 'keys', label: 'Keys' },
    { id: 'id', label: 'ID' },
  ];

  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {tabs.map(({ id, label }) => (
        <button
          type="button"
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 rounded-lg py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 ${
            active === id
              ? 'bg-elevated text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-muted hover:text-subtext'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Address Avatar ──────────────────────────────────────────────────────────

function AddressAvatar({ address }: { address: string }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-elevated font-mono text-[11px] font-bold tracking-tight text-subtext select-none">
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
}

// ─── Wallet Tab ──────────────────────────────────────────────────────────────

function WalletTab({ address, chainId }: { address: string; chainId: string | null }) {
  const [copied, setCopied] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const hex = (await runtimeRequest('eth_getBalance', [address, 'latest'])) as string;
        const numEth = Number(BigInt(hex) * 10000n / (10n ** 18n));
        setBalance(`${(numEth / 10000).toFixed(4)} ETH`);
      } catch { /* extension or provider not ready */ }
    })();
  }, [address]);

  function copyAddress() {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const contractEntries: Array<{ label: string; value: string | null }> = [
    { label: 'Registry', value: contracts.registry },
    { label: 'Policy', value: contracts.policy },
    { label: 'Session', value: contracts.session },
    { label: 'TaskGate', value: contracts.taskGate },
  ];

  return (
    <div className="space-y-3">
      {/* Address card */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <AddressAvatar address={address} />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Address</p>
            <p className="break-all font-mono text-[11px] leading-relaxed text-white tabular-nums">
              {address}
            </p>
          </div>
          <button
            type="button"
            onClick={copyAddress}
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-all hover:border-white/20 hover:text-white active:scale-95"
            title="Copy address"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        {/* Network + balance row */}
        <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            <span className="text-[11px] font-medium text-subtext">{getChainName(chainId)}</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-text">
            {balance ?? (
              <span className="animate-pulse text-muted">—</span>
            )}
          </span>
        </div>
      </div>

      {/* Open in web */}
      {apiBaseUrl && (
        <a
          href={`${apiBaseUrl}/wallet`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-xs font-medium text-subtext transition-all hover:border-white/20 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5" aria-hidden="true">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open in SafeHand Web
        </a>
      )}

      {/* Contracts accordion */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-elevated/40"
          onClick={() => setContractsOpen((v) => !v)}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted">Contracts</p>
          <ChevronIcon open={contractsOpen} />
        </button>

        {contractsOpen && (
          <div className="border-t border-border">
            {contractEntries.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5 even:bg-card/30">
                <span className="text-[11px] text-muted">{label}</span>
                <span className="font-mono text-[10px] text-subtext">{shorten(value, 8, 4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Policy Tab ──────────────────────────────────────────────────────────────

function PolicyTab({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [agentAddress, setAgentAddress] = useState('');
  const [maxUsd, setMaxUsd] = useState('50');
  const [expiryMinutes, setExpiryMinutes] = useState('30');
  const [allowedContracts, setAllowedContracts] = useState('');
  const [policies, setPolicies] = useState<AgentPolicy[]>([]);

  useEffect(() => {
    void loadStoredPolicies();
  }, []);

  async function loadStoredPolicies(): Promise<void> {
    try {
      const output = await chrome.storage.local.get(['proofly.agent-policies.v1']);
      const all = (output['proofly.agent-policies.v1'] as AgentPolicy[] | undefined) ?? [];
      setPolicies(all);
    } catch { /* ignore */ }
  }

  async function revokePolicy(targetAgent: Hex): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await runtimeRequest('PROOFLY_POPUP_DELETE_POLICY', { agentAddress: targetAgent });
      try {
        await runtimeRequest('PROOFLY_POPUP_REVOKE_POLICY_ONCHAIN', { agentAddress: targetAgent });
      } catch { /* gas/offline error does not block local revocation */ }
      await loadStoredPolicies();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function savePolicy(): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const parsedContracts = allowedContracts
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean) as Hex[];

      if (parsedContracts.length === 0) {
        throw new Error('At least one allowed contract address is required.');
      }

      const targetAgent = (agentAddress.trim() || address) as Hex;

      const policy: AgentPolicy = {
        agentAddress: targetAgent,
        maxLimitUSD: Number(maxUsd),
        expiry: Date.now() + Number(expiryMinutes) * 60 * 1000,
        allowedContracts: parsedContracts,
      };

      await runtimeRequest('PROOFLY_POPUP_SAVE_POLICY', policy);

      let policyHash: string | null = null;
      if (apiBaseUrl && address) {
        try {
          const response = await fetch(`${apiBaseUrl}/api/agent/policy/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: address,
              agentAddress: policy.agentAddress,
              maxLimitUSD: policy.maxLimitUSD,
              expiry: policy.expiry,
              allowedContracts: policy.allowedContracts,
            }),
          });
          if (response.ok) {
            const body = (await response.json()) as { policyHash?: string };
            policyHash = body.policyHash ?? null;
          }
        } catch { /* server offline — local save still proceeds */ }
      }

      if (policyHash) {
        await runtimeRequest('PROOFLY_POPUP_SET_POLICY_ONCHAIN', {
          agentAddress: policy.agentAddress,
          policyHash: policyHash as `0x${string}`,
          expiry: policy.expiry,
        }).catch(() => { /* gas errors don't block UX */ });
      }

      setAgentAddress('');
      setAllowedContracts('');
      setSaved(true);
      await loadStoredPolicies();
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text outline-none transition-all placeholder:text-muted focus:border-white/20 focus:bg-elevated';
  const labelCls = 'mb-1.5 block text-[10px] uppercase tracking-widest text-muted';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">AI Leash Policy</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          Define what AI agents and dApps can execute on your behalf.
        </p>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {saved ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3.5 py-2.5">
          <CheckIcon className="size-3.5 text-emerald-400" />
          <p className="text-[11px] text-white/60">
            Policy saved{apiBaseUrl ? ' and synced.' : ' locally.'}
          </p>
        </div>
      ) : null}

      {/* Active Policies List */}
      {policies.length > 0 && (
        <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted">Active Policy Boundaries</p>
          {policies.map((p) => {
            const isExpired = Date.now() > p.expiry;
            const remainingMins = Math.max(0, Math.round((p.expiry - Date.now()) / 60000));
            return (
              <div key={p.agentAddress} className="rounded-xl border border-white/5 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white">
                    {shorten(p.agentAddress, 8, 4)}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isExpired ? 'bg-red-950/40 text-red-400 border border-red-900/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                  }`}>
                    {isExpired ? 'Expired' : `${remainingMins}m left`}
                  </span>
                </div>
                <div className="text-[11px] text-muted flex justify-between">
                  <span>Max Spend: <strong className="text-text">${p.maxLimitUSD} USD</strong></span>
                  <span>Allowed Contracts: <strong className="text-text">{p.allowedContracts.length}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => { void revokePolicy(p.agentAddress); }}
                  disabled={busy}
                  className="w-full mt-2 py-1.5 rounded-lg border border-red-900/40 bg-red-950/20 text-[11px] font-medium text-red-400 hover:bg-red-900/30 transition-colors"
                >
                  Revoke Policy
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy Configuration Form */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Target Agent / Account (Optional, defaults to wallet)</label>
          <input
            className={`${inputCls} font-mono text-xs`}
            placeholder={address ? shorten(address, 10, 6) : "0x…"}
            value={agentAddress}
            onChange={(e) => setAgentAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Max Spend (USD)</label>
            <input
              className={inputCls}
              placeholder="50"
              value={maxUsd}
              onChange={(e) => setMaxUsd(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Expiry (min)</label>
            <input
              className={inputCls}
              placeholder="30"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Allowed Contracts</label>
          <textarea
            className={`${inputCls} min-h-[68px] resize-none font-mono text-xs`}
            placeholder="0x… , 0x… (comma-separated)"
            value={allowedContracts}
            onChange={(e) => setAllowedContracts(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-30"
        onClick={() => { void savePolicy(); }}
        disabled={busy}
      >
        {busy ? 'Saving…' : 'Save Policy'}
      </button>
    </div>
  );
}

// ─── Identity Tab ─────────────────────────────────────────────────────────────

function IdentityTab({ address }: { address: string }) {
  const [zkStatus, setZkStatus] = useState<ZkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loadingRp, setLoadingRp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attestingLocal, setAttestingLocal] = useState(false);

  const worldAppId = import.meta.env.VITE_WORLD_APP_ID as string;
  const worldAction = (import.meta.env.VITE_WORLD_ACTION as string) || 'proofly-human-verify';
  const worldRpId = (import.meta.env.VITE_WORLD_RP_ID as string) || undefined;

  async function reload(): Promise<void> {
    setLoading(true);
    const status = await getZkStatus();
    setZkStatus(status);
    setLoading(false);
  }

  useEffect(() => { void reload(); }, []);

  async function startVerification(): Promise<void> {
    setError(null);
    if (!apiBaseUrl || !worldRpId) {
      setError('Verification server not configured. Set VITE_PROOFLY_API_BASE_URL and VITE_WORLD_RP_ID.');
      return;
    }
    setLoadingRp(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/zk/worldid/rp-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: worldAction }),
      });
      if (!res.ok) throw new Error('Failed to get verification signature.');
      const { sig, nonce, created_at, expires_at } = (await res.json()) as {
        sig: string; nonce: string; created_at: number; expires_at: number;
      };
      setRpContext({ rp_id: worldRpId, nonce, created_at, expires_at, signature: sig });
      setOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingRp(false);
    }
  }

  async function handleVerify(result: IDKitResult): Promise<void> {
    if (!apiBaseUrl) throw new Error('Verification server not configured.');
    try {
      await verifyProofWithServer(result, address as Hex, apiBaseUrl, worldRpId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg.length > 200 ? msg.slice(0, 200) + '…' : msg);
      setOpen(false);
      setRpContext(null);
      throw err;
    }
  }

  function onIDKitError(code: IDKitErrorCodes): void {
    setError(`World ID error (${String(code)}). Check your app credentials or try again.`);
    setOpen(false);
    setRpContext(null);
  }

  async function startLocalAttestation(): Promise<void> {
    setError(null);
    setAttestingLocal(true);
    try {
      const proof = await generateLocalAttestation(address as Hex, worldAction);
      await saveWorldIdProof(proof);
      if (apiBaseUrl) {
        await attestWithServer(proof, apiBaseUrl);
      }
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAttestingLocal(false);
    }
  }

  function onSuccess(result: IDKitResult): void {
    try {
      const normalized = normalizeWorldIdResult(result);
      const record: StoredWorldIdProof = {
        ...normalized,
        action: worldAction,
        walletAddress: address as Hex,
        verifiedAt: Date.now(),
      };
      void saveWorldIdProof(record).then(() => void reload());
    } catch { /* normalization errors are non-fatal */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  if (zkStatus?.verified && zkStatus.proof) {
    const { proof } = zkStatus;
    const verifiedDate = new Date(proof.verifiedAt).toLocaleDateString(undefined, { dateStyle: 'medium' });
    const expiryDate = zkStatus.expiresAt
      ? new Date(zkStatus.expiresAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
      : '—';

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-800/60 bg-emerald-950/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-5 text-emerald-400" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">SafeHand Verified</p>
              <p className="text-[10px] text-emerald-600 capitalize">
                {proof.verificationLevel ?? 'orb'} · verified {verifiedDate}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Nullifier Hash</p>
            <p className="break-all font-mono text-[10px] text-subtext">
              {proof.nullifierHash.slice(0, 18)}…{proof.nullifierHash.slice(-8)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Registered</p>
              <p className="text-xs text-subtext">{verifiedDate}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Expires</p>
              <p className="text-xs text-subtext">{expiryDate}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Identity Unverified</p>
            <p className="text-[10px] text-muted">Prove you are human with SafeHand.</p>
          </div>
        </div>

        <p className="mb-4 text-[11px] leading-relaxed text-muted">
          SafeHand is a privacy-preserving proof of personhood. Your identity stays anonymous —
          only a zero-knowledge proof is recorded on-chain.
        </p>

        {rpContext && (
          <IDKitRequestWidget
            open={open}
            onOpenChange={setOpen}
            app_id={worldAppId as `app_${string}`}
            action={worldAction}
            rp_context={rpContext}
            allow_legacy_proofs
            preset={orbLegacy({ signal: address })}
            handleVerify={handleVerify}
            onSuccess={onSuccess}
            onError={onIDKitError}
          />
        )}

        {error ? (
          <p className="mb-3 rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-[10px] text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          onClick={() => { void startVerification(); }}
          disabled={loadingRp || attestingLocal}
        >
          {loadingRp ? 'Preparing\u2026' : 'Verify with SafeHand'}
        </button>

        <div className="flex items-center gap-2 py-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-muted">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          className="w-full rounded-xl border border-border bg-elevated px-4 py-2.5 text-xs font-semibold text-subtext transition-all hover:border-white/20 hover:text-white disabled:opacity-40"
          onClick={() => { void startLocalAttestation(); }}
          disabled={loadingRp || attestingLocal}
        >
          {attestingLocal ? 'Generating proof\u2026' : 'Prove with Wallet Key'}
        </button>
      </div>
    </div>
  );
}

// ─── Keys Tab ────────────────────────────────────────────────────────────────

function KeysTab() {
  const [revealed, setRevealed] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lockBusy, setLockBusy] = useState(false);
  const refresh = useWalletStore((s) => s.refresh);

  async function lock(): Promise<void> {
    setLockBusy(true);
    try {
      await runtimeRequest('PROOFLY_POPUP_LOCK');
      await refresh();
    } finally {
      setLockBusy(false);
    }
  }

  async function exportKey(): Promise<void> {
    if (revealed) {
      setPrivateKey(null);
      setRevealed(false);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = (await runtimeRequest('PROOFLY_POPUP_EXPORT_PRIVKEY')) as { privateKey: string };
      setPrivateKey(res.privateKey);
      setRevealed(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Lock wallet */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-subtext">
            <LockIcon className="size-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Lock Wallet</p>
            <p className="text-[10px] text-muted">Re-enter password to access.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { void lock(); }}
          disabled={lockBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-subtext transition-all hover:border-white/20 hover:text-white disabled:opacity-30 active:scale-[0.98]"
        >
          <LockIcon className="size-3.5" />
          {lockBusy ? 'Locking…' : 'Lock Now'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-[#3a1a1a] bg-surface p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-[#5a1a1a] bg-[#1a0808] text-red-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-3.5" aria-hidden="true">
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="M21 2l-9.6 9.6M15.5 7.5l2 2M14 9l2 2" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-400">Private Key</p>
            <p className="text-[10px] text-muted">Store offline. Never share.</p>
          </div>
        </div>

        {err ? <p className="mb-3 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">{err}</p> : null}

        {revealed && privateKey ? (
          <div className="mb-3 space-y-2">
            <div className="break-all rounded-xl border border-white/5 bg-card px-3 py-2.5 font-mono text-[10px] leading-relaxed text-subtext select-all">
              {privateKey}
            </div>
            <p className="text-[10px] leading-relaxed text-muted">
              This key gives full access to your wallet. Store it in a secure, offline location.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => { void exportKey(); }}
          disabled={busy}
          className="w-full rounded-xl border border-[#7a1a1a] px-4 py-2.5 text-sm font-medium text-red-400 transition-opacity hover:opacity-80 disabled:opacity-30"
        >
          {busy ? 'Loading…' : revealed ? 'Hide Private Key' : 'Reveal Private Key'}
        </button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function WalletHome(): JSX.Element {
  const address = useWalletStore((s) => s.address);
  const chainId = useWalletStore((s) => s.chainId);
  const [activeTab, setActiveTab] = useState<Tab>('wallet');

  return (
    <div className="space-y-4">
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'wallet' && address && (
        <WalletTab address={address} chainId={chainId} />
      )}
      {activeTab === 'policy' && address && (
        <PolicyTab address={address} />
      )}
      {activeTab === 'keys' && (
        <KeysTab />
      )}
      {activeTab === 'id' && address && (
        <IdentityTab address={address} />
      )}
    </div>
  );
}
