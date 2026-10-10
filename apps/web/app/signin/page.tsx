'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createWalletChallenge, verifyWalletChallenge } from '../../lib/wallet/auth-client';
import { walletRequest } from '../../lib/wallet/provider';
import { useToast } from '../../components/ui/toast';

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Shield({ className = 'size-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="si-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="si-logo-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path
        d="M24 4L6 11V22c0 10.5 7.5 20.3 18 22.8C34.5 42.3 42 32.5 42 22V11L24 4z"
        fill="url(#si-logo-fill)"
        stroke="url(#si-logo-grad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polyline
        points="16,24 21.5,29.5 32,19"
        stroke="url(#si-logo-grad)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {([1, 2, 3] as const).map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            n === step ? 'w-6 bg-accent' : n < step ? 'w-1.5 bg-white/20' : 'w-1.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step variants ────────────────────────────────────────────────────────────

const variants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignInPage(): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formatted address
  const shortAddr = address
    ? `${address.slice(0, 6)}\u2026${address.slice(-4)}`
    : null;

  // ── Step 1: Connect ──────────────────────────────────────────────────────────

  async function connectWallet(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const accounts = (await walletRequest('eth_requestAccounts', [])) as string[];
      const addr = accounts[0] ?? null;
      if (!addr) throw new Error('No accounts returned from wallet.');
      setAddress(addr);
      setStep(2);
      toast({ variant: 'info', title: 'Wallet connected', description: `${addr.slice(0, 6)}\u2026${addr.slice(-4)}` });
    } catch (err) {
      const msg = (err as Error).message ?? 'Failed to connect.';
      setError(msg);
      toast({ variant: 'error', title: 'Connection failed', description: msg });
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2: Sign ─────────────────────────────────────────────────────────────

  async function signIn(): Promise<void> {
    if (!address) return;
    setError(null);
    setBusy(true);
    try {
      const challenge = await createWalletChallenge(address);
      const signature = (await walletRequest('personal_sign', [challenge.message, address])) as string;
      const verification = await verifyWalletChallenge(address, challenge.nonce, signature);

      // Persist to localStorage — picked up by the wallet page
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('proofly.session.address', address);
        localStorage.setItem('proofly.session.token', verification.sessionToken);
      }

      setStep(3);
      toast({ variant: 'success', title: 'Signed in', description: 'Redirecting to dashboard\u2026' });

      setTimeout(() => {
        router.push('/wallet');
      }, 1600);
    } catch (err) {
      const msg = (err as Error).message ?? 'Signing failed.';
      // User rejected is not an error worth toasting loudly
      if (!msg.toLowerCase().includes('user rejected')) {
        toast({ variant: 'error', title: 'Sign-in failed', description: msg });
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-[calc(100vh-56px)] items-center justify-center overflow-hidden px-4 py-16">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.14) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.07) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0A0A0A] shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="flex flex-col items-center px-8 pb-6 pt-8">
            <motion.div
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield />
            </motion.div>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-white">
              {step === 3 ? 'You\u2019re in' : 'Sign In to SafeHand'}
            </h1>
            <p className="mt-1.5 text-center text-sm text-[#71717A]">
              {step === 1
                ? 'Connect your SafeHand wallet extension to continue.'
                : step === 2
                  ? `Connected as ${shortAddr ?? ''}\u2002\u00b7\u2002Sign a message to prove ownership.`
                  : 'Wallet verified. Redirecting to your dashboard\u2026'}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center pb-6">
            <StepDots step={step} />
          </div>

          {/* Step content */}
          <div className="min-h-[160px] overflow-hidden px-8 pb-8">
            <AnimatePresence mode="wait">
              {/* ── Step 1 ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* Wallet icon panel */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5 text-white/70" aria-hidden="true">
                        <rect x="1" y="4" width="22" height="16" rx="3" />
                        <path d="M1 10h22" />
                        <circle cx="16.5" cy="16" r="1.5" fill="currentColor" strokeWidth={0} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">SafeHand Wallet Extension</p>
                      <p className="text-xs text-[#71717A]">Required to connect</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { void connectWallet(); }}
                    disabled={busy}
                    className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    {busy ? 'Connecting\u2026' : 'Connect Wallet'}
                  </button>
                </motion.div>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && address && (
                <motion.div
                  key="step2"
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* Address */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 font-mono text-xs font-bold text-white/60">
                      {address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-white">{shortAddr}</p>
                      <p className="text-xs text-[#71717A]">Base Sepolia</p>
                    </div>
                    <div className="ml-auto flex size-2 shrink-0 items-center justify-center">
                      <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { void signIn(); }}
                    disabled={busy}
                    className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    {busy ? 'Waiting for signature\u2026' : 'Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep(1); setAddress(null); setError(null); }}
                    className="w-full text-center text-xs text-[#71717A] transition-colors hover:text-white"
                  >
                    Use a different wallet
                  </button>
                </motion.div>
              )}

              {/* ── Step 3 ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="flex size-16 items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-950/40"
                  >
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8 text-emerald-400" aria-hidden="true">
                      <polyline points="6 16 12 22 26 10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                  <div className="text-center">
                    <p className="font-mono text-sm text-[#A1A1AA]">{shortAddr}</p>
                    <p className="mt-1 text-xs text-[#71717A]">Redirecting to dashboard\u2026</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && step !== 3 ? (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2.5 text-xs text-red-400"
              >
                {error}
              </motion.p>
            ) : null}
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#52525B]">
          New to SafeHand?{' '}
          <Link
            href="/extension"
            className="text-[#71717A] underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            Install the extension &rarr;
          </Link>
        </p>
      </div>
    </main>
  );
}
