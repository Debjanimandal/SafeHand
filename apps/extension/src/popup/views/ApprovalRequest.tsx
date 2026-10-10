import { IDKitRequestWidget, orbLegacy, type IDKitErrorCodes, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Hex } from 'viem';
import { runtimeRequest } from '../../background/client';
import { recordAudioHash3s } from '../../media/audio-hash';
import type { ApprovalDecision, PendingApprovalRequest } from '../../shared/types';
import {
  normalizeWorldIdResult,
  saveWorldIdProof,
  verifyProofWithServer,
  type WorldIdProofBundle,
} from '../../zk/world-id';

interface ApprovalRequestViewProps {
  approval: PendingApprovalRequest;
  chainId: Hex;
  address: Hex;
}

const apiBaseUrl = import.meta.env.VITE_PROOFLY_API_BASE_URL?.replace(/\/$/, '') as string | undefined;
const worldAction = (import.meta.env.VITE_WORLD_ACTION as string) || 'proofly-human-verify';

// ─── Icons ────────────────────────────────────────────────────────────────────

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</span>
      <span className="break-all text-right font-mono text-[10.5px] text-subtext">{value}</span>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={[
      'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-300',
      done
        ? 'border-success/25 bg-success/10 text-success'
        : 'border-white/[0.06] bg-surface text-muted',
    ].join(' ')}>
      <span className={done ? 'text-success' : ''}>
        {done ? <CheckCircleIcon /> : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </span>
      {label}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ApprovalRequestView({ approval, chainId, address }: ApprovalRequestViewProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [worldProof, setWorldProof] = useState<WorldIdProofBundle | null>(null);
  const [voiceHash, setVoiceHash] = useState<Hex | null>(null);
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loadingRp, setLoadingRp] = useState(false);

  const worldRpId = (import.meta.env.VITE_WORLD_RP_ID as string) || undefined;
  const worldAppId = import.meta.env.VITE_WORLD_APP_ID as string;
  const isConnect = approval.method === 'eth_requestAccounts';

  async function sendDecision(decision: ApprovalDecision): Promise<void> {
    await runtimeRequest('PROOFLY_POPUP_APPROVAL_RESULT', decision);
    window.close();
  }

  async function startVerification(): Promise<void> {
    setError(null);
    if (!apiBaseUrl || !worldRpId) {
      setError('Verification server not configured.');
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
      await verifyProofWithServer(result, address, apiBaseUrl, worldRpId);
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

  async function onWorldIdSuccess(result: IDKitResult): Promise<void> {
    const normalized = normalizeWorldIdResult(result);
    await saveWorldIdProof({
      ...normalized,
      action: worldAction,
      walletAddress: address,
      verifiedAt: Date.now(),
    });
    setWorldProof(normalized);
  }

  async function recordVoice(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const hash = await recordAudioHash3s();
      setVoiceHash(hash);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approve(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (approval.requiresHumanProof) {
        if (!worldProof || !voiceHash) {
          throw new Error('High-security request requires World ID proof and voice hash.');
        }
        await sendDecision({
          id: approval.id,
          approved: true,
          proofContext: {
            zkProof: worldProof.proof,
            nullifier: worldProof.nullifierHash,
            voiceHash,
          },
        });
        return;
      }
      await sendDecision({ id: approval.id, approved: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function reject(): Promise<void> {
    await sendDecision({ id: approval.id, approved: false, reason: 'User rejected request.' });
  }

  const canApprove = !busy && (!approval.requiresHumanProof || (Boolean(worldProof) && Boolean(voiceHash)));

  // Shortened origin for display
  const displayOrigin = (() => {
    try {
      return new URL(approval.origin).hostname;
    } catch {
      return approval.origin;
    }
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
    >
      {/* ── Site / Request header card ── */}
      <div className={[
        'rounded-2xl border p-4',
        isConnect
          ? 'border-accent/20 bg-gradient-to-br from-accent/[0.07] to-transparent'
          : approval.requiresHumanProof
            ? 'border-warning/20 bg-gradient-to-br from-warning/[0.07] to-transparent'
            : 'border-white/[0.06] bg-surface',
      ].join(' ')}>
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={[
            'flex size-12 shrink-0 items-center justify-center rounded-2xl border',
            isConnect
              ? 'border-accent/25 bg-accent/15 text-accent'
              : approval.requiresHumanProof
                ? 'border-warning/25 bg-warning/15 text-warning'
                : 'border-white/[0.08] bg-elevated text-subtext',
          ].join(' ')}>
            {isConnect ? <LinkIcon /> : approval.requiresHumanProof ? <AlertIcon /> : <ShieldCheckIcon />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {isConnect ? 'Connect Wallet' : approval.requiresHumanProof ? 'High-Security Request' : 'Sign Request'}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">{displayOrigin}</p>
            {approval.requiresHumanProof && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
                Proof Required
              </span>
            )}
          </div>
        </div>

        {isConnect && (
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            This site wants to view your wallet address. Transactions require separate approvals.
          </p>
        )}
      </div>

      {/* ── Request details ── */}
      {!isConnect && (
        <div className="divide-y divide-white/[0.04] rounded-2xl border border-white/[0.06] bg-surface px-4">
          <InfoRow label="Origin" value={displayOrigin} />
          <InfoRow label="Method" value={approval.method} />
          <InfoRow label="Chain" value={chainId} />
        </div>
      )}

      {isConnect && (
        <div className="divide-y divide-white/[0.04] rounded-2xl border border-white/[0.06] bg-surface px-4">
          <InfoRow label="Chain" value={chainId} />
          <InfoRow label="Address" value={`${address.slice(0, 10)}…${address.slice(-6)}`} />
        </div>
      )}

      {/* ── High-security verification ── */}
      <AnimatePresence>
        {approval.requiresHumanProof && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden space-y-2 rounded-2xl border border-white/[0.06] bg-surface p-3"
          >
            <p className="text-[11px] font-semibold text-subtext">Required Verifications</p>

            <StatusBadge done={Boolean(worldProof)} label="World ID Proof" />
            <StatusBadge done={Boolean(voiceHash)} label="Voice Hash (3s)" />

            <div className="grid grid-cols-2 gap-2 pt-1">
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
                  onSuccess={(result) => { void onWorldIdSuccess(result); }}
                  onError={onIDKitError}
                />
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={busy || Boolean(worldProof) || loadingRp}
                onClick={() => { void startVerification(); }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-elevated px-3 py-2 text-xs font-medium text-subtext transition-all hover:border-white/15 hover:text-white disabled:opacity-40"
              >
                {worldProof ? <CheckCircleIcon /> : <ShieldCheckIcon />}
                {worldProof ? 'Verified' : loadingRp ? 'Preparing…' : 'World ID'}
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={busy || Boolean(voiceHash)}
                onClick={() => { void recordVoice(); }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-elevated px-3 py-2 text-xs font-medium text-subtext transition-all hover:border-white/15 hover:text-white disabled:opacity-40"
              >
                {voiceHash ? <CheckCircleIcon /> : <MicIcon />}
                {voiceHash ? 'Recorded' : 'Voice Hash'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action buttons ── */}
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => { void reject(); }}
          disabled={busy}
          className="rounded-xl border border-white/[0.06] bg-surface px-4 py-3 text-sm font-semibold text-subtext transition-all hover:border-white/15 hover:text-white disabled:opacity-40"
        >
          Reject
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => { void approve(); }}
          disabled={!canApprove}
          className={[
            'rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-40',
            isConnect
              ? 'bg-accent shadow-glow-sm hover:bg-accent-dim'
              : approval.requiresHumanProof
                ? 'bg-warning/90 text-black hover:bg-warning'
                : 'bg-white text-black hover:opacity-90',
          ].join(' ')}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-3.5 animate-spin rounded-full border-2 border-current/20 border-t-current" />
              Working…
            </span>
          ) : (isConnect ? 'Connect' : 'Approve')}
        </motion.button>
      </div>
    </motion.section>
  );
}
