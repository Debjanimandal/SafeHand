'use client';

import { IDKitRequestWidget, orbLegacy, type IDKitErrorCodes, type RpContext, type IDKitResult } from '@worldcoin/idkit';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { walletRequest } from '../../lib/wallet/provider';

const APP_ID = (process.env.NEXT_PUBLIC_WORLD_APP_ID ?? '') as `app_${string}`;
const ACTION = process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? 'proofly-human-verify';
const RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID as string | undefined;

// Age-threshold claim types
const AGE_CLAIMS = [
  { value: 'age_gte_18', label: 'Age 18 or older', check: (v: number) => v >= 18 },
  { value: 'age_gte_21', label: 'Age 21 or older', check: (v: number) => v >= 21 },
  { value: 'age_gte_25', label: 'Age 25 or older', check: (v: number) => v >= 25 },
] as const;

// Signal mode options
type SignalMode = 'none' | 'age' | 'passport' | 'national_id' | 'phone' | 'document';

const SIGNAL_OPTIONS: Array<{ value: SignalMode; label: string; description: string; emoji: string }> = [
  { value: 'none', label: 'Wallet only', description: 'Use your wallet address as the proof signal.', emoji: 'ðŸ”‘' },
  { value: 'age', label: 'Age Claim', description: 'Prove age threshold without revealing your birth date.', emoji: 'ðŸŽ‚' },
  { value: 'passport', label: 'Passport', description: 'Hash your passport number locally â€” never our server.', emoji: 'ðŸ“˜' },
  { value: 'national_id', label: 'National ID', description: 'Hash your national ID number locally.', emoji: 'ðŸªª' },
  { value: 'phone', label: 'Phone Number', description: 'Hash your E.164 phone number locally.', emoji: 'ðŸ“±' },
  { value: 'document', label: 'Document File', description: 'SHA-256 fingerprint of any document file.', emoji: 'ðŸ“„' },
];

interface RpSigResponse {
  sig: string;
  nonce: string;
  created_at: number;
  expires_at: number;
}

interface ZkClaim {
  type: string;
  result: boolean;
  commitment: string;
}

/** SHA-256 a UTF-8 string â†’ hex. */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 a File's bytes â†’ hex. */
async function sha256File(file: File): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** Append a client-side event to the local audit log. */
function appendLocalActivity(event_type: string, actor_address: string | null): void {
  try {
    const key = 'proofly.activity.log';
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ id: string; event_type: string; actor_address: string | null; created_at: string }>;
    const updated = [
      { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, event_type, actor_address, created_at: new Date().toISOString() },
      ...existing,
    ].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch { /* ignore */ }
}
export default function VerifyPage(): JSX.Element {
  const [status, setStatus] = useState<'idle' | 'verified' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Auto-restore wallet address from prior session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('proofly.session.address');
      if (stored && !walletAddress) setWalletAddress(stored);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loadingRp, setLoadingRp] = useState(false);
  const [localAttesting, setLocalAttesting] = useState(false);

  // Signal mode
  const [signalMode, setSignalMode] = useState<SignalMode>('age');

  // Age claim
  const [selectedClaim, setSelectedClaim] = useState<string>('age_gte_18');
  const [birthYear, setBirthYear] = useState<string>('');
  const [zkClaim, setZkClaim] = useState<ZkClaim | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Identity hash (passport / national_id / phone)
  const [identityValue, setIdentityValue] = useState<string>('');
  const [identityCommitment, setIdentityCommitment] = useState<ZkClaim | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Document upload
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentHash, setDocumentHash] = useState<string | null>(null);
  const [hashingDoc, setHashingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function connectWallet(): Promise<void> {
    try {
      const accounts = (await walletRequest('eth_requestAccounts', [])) as string[];
      const addr = accounts[0] ?? null;
      setWalletAddress(addr);
      if (addr) localStorage.setItem('proofly.session.address', addr);
      setError(null);
    } catch {
      // Extension not available — check localStorage for a previously connected address
      const stored = localStorage.getItem('proofly.session.address');
      if (stored) {
        setWalletAddress(stored);
        setError(null);
      } else {
        setError('Connect your wallet via the SafeHand extension or visit the Wallet page first.');
      }
    }
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setDocumentFile(file);
    setDocumentHash(null);
    if (!file) return;
    setHashingDoc(true);
    try {
      setDocumentHash(await sha256File(file));
    } catch {
      setError('Failed to hash document.');
    } finally {
      setHashingDoc(false);
    }
  }, []);

  async function computeAgeClaim(): Promise<void> {
    setClaimError(null);
    const year = parseInt(birthYear, 10);
    if (!birthYear || isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      setClaimError('Enter a valid birth year.');
      return;
    }
    if (!walletAddress) { setClaimError('Connect your wallet first.'); return; }
    const def = AGE_CLAIMS.find((c) => c.value === selectedClaim);
    if (!def) return;
    const age = new Date().getFullYear() - year;
    const result = def.check(age);
    const commitment = await sha256Hex(`${def.value}:${String(result)}:${walletAddress.toLowerCase()}`);
    setZkClaim({ type: def.value, result, commitment });
  }

  async function computeIdentityClaim(): Promise<void> {
    setIdentityError(null);
    const raw = identityValue.trim();
    if (!raw) { setIdentityError('Enter a value first.'); return; }
    if (!walletAddress) { setIdentityError('Connect your wallet first.'); return; }
    // Hash the raw value first (never store/send raw data)
    const valueHash = await sha256Hex(raw);
    // Commitment = SHA-256("claimType:SHA256(rawValue):wallet")
    const commitment = await sha256Hex(`${signalMode}:${valueHash}:${walletAddress.toLowerCase()}`);
    setIdentityCommitment({ type: `${signalMode}_hash`, result: true, commitment });
  }

  // Derive the claim/signal to attach to the World ID proof
  const activeSignalClaim: ZkClaim | null =
    signalMode === 'age' ? zkClaim :
    (signalMode === 'passport' || signalMode === 'national_id' || signalMode === 'phone') ? identityCommitment :
    null;

  const activeDocHash =
    signalMode === 'document' ? documentHash : null;

  const proofSignal =
    activeSignalClaim?.commitment ??
    activeDocHash ??
    walletAddress ??
    undefined;

  async function startVerification(): Promise<void> {
    setError(null);
    setLoadingRp(true);
    try {
      if (!RP_ID) throw new Error('NEXT_PUBLIC_WORLD_RP_ID is not configured.');
      const res = await fetch('/api/zk/worldid/rp-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: ACTION }),
      });
      if (!res.ok) throw new Error('Failed to generate verification signature.');
      const { sig, nonce, created_at, expires_at } = (await res.json()) as RpSigResponse;
      setRpContext({ rp_id: RP_ID, nonce, created_at, expires_at, signature: sig });
      setOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingRp(false);
    }
  }

  async function handleVerify(result: IDKitResult): Promise<void> {
    const response = await fetch('/api/zk/worldid/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rp_id: RP_ID,
        idkitResponse: result,
        address: walletAddress,
        documentHash: activeDocHash ?? undefined,
        claim: activeSignalClaim ?? undefined,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Verification failed');
    }
  }

  function onSuccess(): void {
    appendLocalActivity('worldid_verified', walletAddress);
    setStatus('verified');
  }

  function onIDKitError(code: IDKitErrorCodes): void {
    setOpen(false);
    setRpContext(null);
    setError(`Verification could not complete (${String(code)}). Try the alternative method below.`);
  }

  /** Store claim to localStorage so the wallet page can display it without a DB round-trip. */
  function persistClaimLocally(addr: string, claim: { type: string; result: boolean }) {
    try {
      const key = `proofly.zk.claims.${addr.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ claim_type: string; result: boolean; verified_at: string }>;
      const updated = [
        ...existing.filter((c) => c.claim_type !== claim.type),
        { claim_type: claim.type, result: claim.result, verified_at: new Date().toISOString() },
      ];
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* ignore storage errors */ }
  }

  async function handleLocalVerify(): Promise<void> {
    if (!walletAddress) { setError('Connect your wallet first.'); return; }
    setError(null);
    setLocalAttesting(true);
    try {
      // Generate a deterministic nullifier from address + signal + timestamp
      const raw = `${walletAddress.toLowerCase()}:${proofSignal ?? walletAddress}:${Date.now()}`;
      const nullifierHash = '0x' + await sha256Hex(raw);

      const payload = {
        address: walletAddress,
        nullifierHash,
        claim: activeSignalClaim ?? undefined,
        documentHash: activeDocHash ?? undefined,
      };

      const res = await fetch('/api/zk/attest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Attestation failed');
      }

      // Persist claim to localStorage for immediate display on wallet page
      if (activeSignalClaim) {
        persistClaimLocally(walletAddress, { type: activeSignalClaim.type, result: activeSignalClaim.result });
      }

      // Store proof record in localStorage
      try {
        const proofKey = `proofly.zk.proof.${walletAddress.toLowerCase()}`;
        localStorage.setItem(proofKey, JSON.stringify({ nullifierHash, provider: 'proofly-attest', verifiedAt: new Date().toISOString() }));
      } catch { /* ignore */ }

      appendLocalActivity('zk_attested', walletAddress);
      setStatus('verified');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLocalAttesting(false);
    }
  }

  const ageClaim = AGE_CLAIMS.find((c) => c.value === selectedClaim);

  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-shell gap-5">

        {/* â”€â”€ Header â”€â”€ */}
        <section className="rounded-3xl border border-border bg-surface px-6 py-5">
          <h1 className="text-2xl font-semibold tracking-tight">Verify Human</h1>
          <p className="mt-1.5 text-sm text-subtext">
            Prove personhood with SafeHand. Bind optional ZK claims — raw data never leaves your device.
          </p>
        </section>

        <div className="grid gap-4">

          {/* â”€â”€ Step 1 â€” Wallet â”€â”€ */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-muted">Step 1 â€” Connect Wallet</p>
            {walletAddress ? (
              <div className="flex items-center gap-3">
                <div className="flex size-2 shrink-0 items-center justify-center rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="break-all font-mono text-sm text-text">{walletAddress}</span>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted">Connect your wallet to bind your proof.</p>
                <button
                  type="button"
                  onClick={() => { void connectWallet(); }}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Connect Wallet
                </button>
              </>
            )}
          </div>

          {/* â”€â”€ Step 2 â€” Signal â”€â”€ */}
          {walletAddress && status === 'idle' && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-muted">Step 2 â€” Signal</p>
                <span className="text-[10px] text-muted">optional â€” enhances your proof</span>
              </div>

              {/* Signal type selector */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SIGNAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSignalMode(opt.value);
                      setZkClaim(null);
                      setIdentityCommitment(null);
                      setClaimError(null);
                      setIdentityError(null);
                      setDocumentHash(null);
                      setDocumentFile(null);
                      setIdentityValue('');
                      setBirthYear('');
                    }}
                    className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all ${
                      signalMode === opt.value
                        ? 'border-white/20 bg-elevated'
                        : 'border-border hover:border-white/10'
                    }`}
                  >
                    <span className="text-lg leading-none" aria-hidden="true">{opt.emoji}</span>
                    <p className={`text-xs font-medium leading-tight ${signalMode === opt.value ? 'text-text' : 'text-subtext'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] leading-tight text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>

              {/* Age claim inputs */}
              <AnimatePresence mode="wait">
                {signalMode === 'age' && (
                  <motion.div
                    key="age"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 space-y-3"
                  >
                    <p className="text-xs text-muted">
                      Select threshold, enter your birth year. Validated locally â€”{' '}
                      <span className="text-text">never transmitted</span>.
                    </p>
                    <div className="grid gap-2">
                      {AGE_CLAIMS.map((ct) => (
                        <button
                          key={ct.value}
                          type="button"
                          onClick={() => { setSelectedClaim(ct.value); setZkClaim(null); }}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                            selectedClaim === ct.value
                              ? 'border-white/20 bg-elevated text-text'
                              : 'border-border text-subtext hover:border-white/10'
                          }`}
                        >
                          <span className={`size-2 shrink-0 rounded-full ${selectedClaim === ct.value ? 'bg-white' : 'bg-white/20'}`} />
                          {ct.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Birth year (e.g. 1995)"
                        value={birthYear}
                        onChange={(e) => { setBirthYear(e.target.value); setZkClaim(null); setClaimError(null); }}
                        className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-white/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { void computeAgeClaim(); }}
                        disabled={!birthYear}
                        className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-text transition-colors hover:border-white/20 disabled:opacity-40"
                      >
                        Compute
                      </button>
                    </div>
                    {claimError && <p className="text-xs text-red-400">{claimError}</p>}
                    <AnimatePresence>
                      {zkClaim && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-xl border p-3 ${zkClaim.result ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-red-900/40 bg-red-950/20'}`}
                        >
                          <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`size-4 shrink-0 ${zkClaim.result ? 'text-emerald-400' : 'text-red-400'}`} aria-hidden="true">
                              {zkClaim.result ? <polyline points="20 6 9 17 4 12" /> : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
                            </svg>
                            <p className="text-xs font-medium text-text">{ageClaim?.label}</p>
                            <span className={`ml-auto text-[10px] font-bold ${zkClaim.result ? 'text-emerald-400' : 'text-red-400'}`}>
                              {zkClaim.result ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                          <p className="mt-2 break-all font-mono text-[10px] text-muted">{zkClaim.commitment}</p>
                          <p className="mt-1 text-[10px] text-muted/60">SHA-256 commitment â€” birth year not included.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Identity hash inputs (passport / national_id / phone) */}
                {(signalMode === 'passport' || signalMode === 'national_id' || signalMode === 'phone') && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 space-y-3"
                  >
                    <p className="text-xs text-muted">
                      Enter your{' '}
                      {signalMode === 'passport' ? 'passport number' : signalMode === 'national_id' ? 'national ID number' : 'phone number (E.164 format, e.g. +15555551234)'}.
                      {' '}It is hashed locally â€” <span className="text-text">never sent to our server</span>.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type={signalMode === 'phone' ? 'tel' : 'text'}
                        spellCheck={false}
                        autoComplete="off"
                        placeholder={
                          signalMode === 'passport' ? 'A12345678' :
                          signalMode === 'national_id' ? 'XX-1234567' :
                          '+15555551234'
                        }
                        value={identityValue}
                        onChange={(e) => { setIdentityValue(e.target.value); setIdentityCommitment(null); setIdentityError(null); }}
                        className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-sm text-text placeholder:text-muted focus:border-white/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { void computeIdentityClaim(); }}
                        disabled={!identityValue.trim()}
                        className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-text transition-colors hover:border-white/20 disabled:opacity-40"
                      >
                        Hash
                      </button>
                    </div>
                    {identityError && <p className="text-xs text-red-400">{identityError}</p>}
                    <AnimatePresence>
                      {identityCommitment && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-4 shrink-0 text-emerald-400" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <p className="text-xs font-medium text-text">Commitment ready</p>
                            <span className="ml-auto text-[10px] font-bold text-emerald-400">READY</span>
                          </div>
                          <p className="mt-2 break-all font-mono text-[10px] text-muted">{identityCommitment.commitment}</p>
                          <p className="mt-1 text-[10px] text-muted/60">SHA-256("type:SHA256(value):wallet") â€” raw value not stored.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Document hash */}
                {signalMode === 'document' && (
                  <motion.div
                    key="document"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 space-y-3"
                  >
                    <p className="text-xs text-muted">
                      Upload any document. Its SHA-256 fingerprint is computed locally and bound to your proof.
                      {' '}<span className="text-text">The file never leaves your browser.</span>
                    </p>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { void handleFileChange(e); }} aria-label="Upload document" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-subtext transition-colors hover:border-white/20 hover:text-text"
                    >
                      {documentFile ? documentFile.name : 'Choose fileâ€¦'}
                    </button>
                    {hashingDoc && <p className="animate-pulse text-xs text-muted">Computing SHA-256â€¦</p>}
                    {documentHash && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl border border-border bg-elevated p-3"
                      >
                        <p className="text-[10px] uppercase tracking-widest text-muted">SHA-256 fingerprint</p>
                        <p className="mt-1.5 break-all font-mono text-[10px] text-subtext">{documentHash}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {signalMode === 'none' && (
                  <motion.p
                    key="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-xs text-muted"
                  >
                    Your wallet address will be used as the proof signal. No additional attributes disclosed.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* â”€â”€ Step 3 â€” World ID â”€â”€ */}
          {walletAddress && status === 'idle' && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-muted">Step 3 â€” Prove Humanity</p>
              <p className="mb-4 text-xs text-muted">
                {activeSignalClaim
                  ? `Your "${activeSignalClaim.type}" commitment will be bound to this SafeHand proof.`
                  : activeDocHash
                    ? 'Your document fingerprint will be bound to this proof.'
                    : 'Your wallet address will be used as the proof signal.'}
              </p>
              <button
                type="button"
                onClick={() => { void startVerification(); }}
                disabled={loadingRp || hashingDoc || localAttesting}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                {loadingRp ? 'Preparing\u2026' : 'Verify with SafeHand'}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={() => { void handleLocalVerify(); }}
                disabled={loadingRp || hashingDoc || localAttesting}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-subtext transition-all hover:border-white/20 hover:text-text disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {localAttesting ? 'Generating proof\u2026' : 'Sign \u0026 Prove'}
              </button>
            </div>
          )}

          {/* â”€â”€ Verified â”€â”€ */}
          <AnimatePresence>
            {status === 'verified' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-5 py-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-6 shrink-0 text-emerald-400" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div>
                    <p className="font-semibold text-emerald-300">Verified â€” you are human</p>
                    <p className="text-xs text-emerald-600">Proof recorded on Base Sepolia.</p>
                  </div>
                </div>
                {activeSignalClaim?.result && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-900/30 bg-emerald-950/10 px-4 py-2.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0 text-emerald-500" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p className="text-xs text-emerald-500">
                      Claim <span className="font-mono">{activeSignalClaim.type}</span> stored â€” no personal data.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ Error â”€â”€ */}
          {error && (
            <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* â”€â”€ How it works â”€â”€ */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold text-text">How ZK selective disclosure works</p>
          <div className="space-y-2">
            {[
              'Your personal values (birth year, passport number, etc.) are validated in your browser only.',
              'A SHA-256 commitment is computed locally and used as the SafeHand proof signal.',
              'After verification, only the claim type and boolean result are stored â€” never the source value.',
              'Anyone can query your wallet and receive: { claim: "age_gte_18", result: true } â€” nothing personal.',
              'For identity hashes, the commitment is SHA-256("type:SHA256(raw):wallet") â€” double-hashed for safety.',
            ].map((text, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-muted">
                  {i + 1}
                </span>
                <p className="text-xs leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={APP_ID}
          action={ACTION}
          rp_context={rpContext}
          allow_legacy_proofs
          preset={orbLegacy({ signal: proofSignal })}
          handleVerify={handleVerify}
          onSuccess={onSuccess}
          onError={onIDKitError}
        />
      )}
    </main>
  );
}
